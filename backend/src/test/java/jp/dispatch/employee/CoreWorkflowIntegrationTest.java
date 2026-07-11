package jp.dispatch.employee;

import jp.dispatch.employee.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker = true)
class CoreWorkflowIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("employee_mgmt_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("app.client-event.reminder.enabled", () -> "false");
        registry.add("app.employee-status.maintenance.enabled", () -> "false");
        registry.add("app.project.cancel-followup-email-enabled", () -> "false");
    }

    @LocalServerPort
    int port;

    @Autowired
    TestRestTemplate rest;

    @Autowired
    AuditLogRepository auditLogRepository;

    private String baseUrl;

    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port + "/api";
        rest = rest.withBasicAuth("", "");
    }

    @Test
    void hrUserCanLoginAndFetchProfile() {
        var loginResponse = postJson("/auth/login", Map.of("username", "hr", "password", "hr123"));
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginResponse.getBody()).containsEntry("status", "SUCCESS");

        var headers = sessionHeaders(loginResponse.getHeaders());
        var meResponse = rest.exchange(baseUrl + "/auth/me", HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        assertThat(meResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(meResponse.getBody()).containsEntry("username", "hr");
    }

    @Test
    void loginCreatesAuditLogEntry() {
        loginAs("hr", "hr123");
        var logs = auditLogRepository.findRecent(20, "LOGIN");
        assertThat(logs).anyMatch(log -> "hr".equals(log.username()));
    }

    @Test
    void hrUserCannotViewAuditLogs() {
        var headers = loginAs("hr", "hr123");
        var auditResponse = rest.exchange(
                baseUrl + "/admin/audit-logs",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
        );
        assertThat(auditResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void authenticatedUserCanSearchEmployees() {
        var headers = loginAs("hr", "hr123");
        var employeesResponse = rest.exchange(
                baseUrl + "/employees",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                List.class
        );
        assertThat(employeesResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(employeesResponse.getBody()).isNotNull();
    }

    @Test
    void unauthenticatedRequestIsRejected() {
        var response = rest.getForEntity(baseUrl + "/employees", Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void hrUserCannotAccessProjectFeatures() {
        var headers = loginAs("hr", "hr123");
        var projectsResponse = rest.exchange(
                baseUrl + "/projects",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                List.class
        );
        assertThat(projectsResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void hrUserCanAccessFileManagement() {
        var headers = loginAs("hr", "hr123");
        var filesResponse = rest.exchange(
                baseUrl + "/files",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                List.class
        );
        assertThat(filesResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void authenticatedUserCanBookMeetingRoom() {
        var headers = loginAs("hr", "hr123");
        var roomsResponse = rest.exchange(
                baseUrl + "/meeting-rooms",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                List.class
        );
        assertThat(roomsResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(roomsResponse.getBody()).isNotEmpty();

        String date = java.time.LocalDate.now().plusWeeks(1).with(java.time.DayOfWeek.MONDAY).toString();
        var createHeaders = new HttpHeaders();
        createHeaders.putAll(headers);
        createHeaders.setContentType(MediaType.APPLICATION_JSON);
        var createResponse = rest.exchange(
                baseUrl + "/meeting-room-reservations",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of(
                                "title", "テスト会議",
                                "startAt", date + "T10:00:00",
                                "endAt", date + "T10:30:00",
                                "description", "integration test"
                        ),
                        createHeaders
                ),
                Map.class
        );
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(createResponse.getBody()).containsEntry("title", "テスト会議");

        var conflictResponse = rest.exchange(
                baseUrl + "/meeting-room-reservations",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of(
                                "title", "重複会議",
                                "startAt", date + "T10:15:00",
                                "endAt", date + "T10:45:00"
                        ),
                        createHeaders
                ),
                Map.class
        );
        assertThat(conflictResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void adminCanCreateMeetingRoomButDuplicateNameOnSameFloorIsRejected() {
        var headers = loginAs("admin", "admin123");
        assertThat(headers).isNotNull();

        var createResponse = rest.exchange(
                baseUrl + "/meeting-rooms",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of(
                                "name", "テスト会議室C",
                                "floor", "5F",
                                "slotMinutes", 30,
                                "businessStart", "09:00",
                                "businessEnd", "22:00",
                                "active", true
                        ),
                        headers
                ),
                Map.class
        );
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(createResponse.getBody()).containsEntry("name", "テスト会議室C");

        var duplicateResponse = rest.exchange(
                baseUrl + "/meeting-rooms",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of(
                                "name", " テスト会議室C ",
                                "floor", "5F",
                                "slotMinutes", 30,
                                "businessStart", "09:00",
                                "businessEnd", "22:00",
                                "active", true
                        ),
                        headers
                ),
                Map.class
        );
        assertThat(duplicateResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        var differentFloorResponse = rest.exchange(
                baseUrl + "/meeting-rooms",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of(
                                "name", "テスト会議室C",
                                "floor", "6F",
                                "slotMinutes", 30,
                                "businessStart", "09:00",
                                "businessEnd", "22:00",
                                "active", true
                        ),
                        headers
                ),
                Map.class
        );
        assertThat(differentFloorResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        var hrHeaders = loginAs("hr", "hr123");
        var forbiddenResponse = rest.exchange(
                baseUrl + "/meeting-rooms",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of(
                                "name", "人事作成会議室",
                                "slotMinutes", 30,
                                "businessStart", "09:00",
                                "businessEnd", "22:00",
                                "active", true
                        ),
                        hrHeaders
                ),
                Map.class
        );
        assertThat(forbiddenResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void adminCanDeleteMeetingRoomAndItsReservations() {
        var headers = loginAs("admin", "admin123");
        assertThat(headers).isNotNull();

        var createResponse = rest.exchange(
                baseUrl + "/meeting-rooms",
                HttpMethod.POST,
                new HttpEntity<>(
                        Map.of(
                                "name", "削除テスト会議室",
                                "floor", "9",
                                "slotMinutes", 30,
                                "businessStart", "09:00",
                                "businessEnd", "22:00",
                                "active", true
                        ),
                        headers
                ),
                Map.class
        );
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        Number roomId = (Number) createResponse.getBody().get("id");

        var deleteResponse = rest.exchange(
                baseUrl + "/meeting-rooms/" + roomId.longValue(),
                HttpMethod.DELETE,
                new HttpEntity<>(headers),
                Void.class
        );
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        var getResponse = rest.exchange(
                baseUrl + "/meeting-rooms/" + roomId.longValue(),
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
        );
        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    private HttpHeaders loginAs(String username, String password) {
        var loginResponse = postJson("/auth/login", Map.of("username", username, "password", password));
        if (loginResponse.getStatusCode() != HttpStatus.OK) {
            return null;
        }
        Map<?, ?> body = loginResponse.getBody();
        if (body == null || !"SUCCESS".equals(body.get("status"))) {
            return null;
        }
        return sessionHeaders(loginResponse.getHeaders());
    }

    private ResponseEntity<Map> postJson(String path, Map<String, String> payload) {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return rest.exchange(
                baseUrl + path,
                HttpMethod.POST,
                new HttpEntity<>(payload, headers),
                Map.class
        );
    }

    private static HttpHeaders sessionHeaders(HttpHeaders responseHeaders) {
        var headers = new HttpHeaders();
        List<String> cookies = responseHeaders.get(HttpHeaders.SET_COOKIE);
        if (cookies != null && !cookies.isEmpty()) {
            headers.add(HttpHeaders.COOKIE, String.join("; ", cookies.stream().map(c -> c.split(";", 2)[0]).toList()));
        }
        return headers;
    }
}
