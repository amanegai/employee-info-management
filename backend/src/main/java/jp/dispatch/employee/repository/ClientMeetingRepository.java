package jp.dispatch.employee.repository;

import jp.dispatch.employee.dto.ClientIssueDto;
import jp.dispatch.employee.dto.ClientMeetingAttendeeDto;
import jp.dispatch.employee.dto.ClientMeetingDto;
import jp.dispatch.employee.dto.ClientMeetingSummaryDto;
import jp.dispatch.employee.dto.EligibleParticipantDto;
import jp.dispatch.employee.config.DatabaseDialect;
import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.model.MasterData;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class ClientMeetingRepository {

    private final JdbcTemplate jdbc;
    private final DatabaseDialect dialect;

    public ClientMeetingRepository(JdbcTemplate jdbc, DatabaseDialect dialect) {
        this.jdbc = jdbc;
        this.dialect = dialect;
    }

    public List<ClientMeetingDto> search(
            String keyword,
            String dateFrom,
            String dateTo,
            Long attendeeEmployeeId,
            String taskStatus,
            Long taskAssigneeEmployeeId,
            List<Long> scopeDepartmentIds
    ) {
        var sql = new StringBuilder("""
                SELECT cm.id, cm.client_id, cm.client_name, cm.client_contact_person, cm.title, cm.meeting_date, cm.meeting_time,
                       cm.location, cm.agenda, cm.minutes_body, cm.issues_summary, cm.created_at, cm.updated_at,
                       au.display_name AS created_by_name
                FROM client_meeting cm
                LEFT JOIN auth_user au ON au.id = cm.created_by
                WHERE 1=1
                """);
        var params = new ArrayList<Object>();

        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + keyword.trim() + "%";
            sql.append("""
                     AND (
                         """);
            sql.append(dialect.likeIgnoreCase("cm.client_name"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("cm.client_contact_person"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("cm.title"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("cm.location"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("cm.agenda"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("cm.minutes_body"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("cm.issues_summary"));
            sql.append("""
                          OR EXISTS (
                             SELECT 1 FROM client_issue ci
                             WHERE ci.meeting_id = cm.id
                               AND (
                                   """);
            sql.append(dialect.likeIgnoreCase("ci.title"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("ci.description"));
            sql.append("""
                               )
                         )
                     )
                    """);
            for (int i = 0; i < 9; i++) {
                params.add(pattern);
            }
        }
        if (dateFrom != null && !dateFrom.isBlank()) {
            sql.append(" AND ").append(dialect.textDateGreaterOrEqualParam("cm.meeting_date"));
            params.add(dateFrom.trim());
        }
        if (dateTo != null && !dateTo.isBlank()) {
            sql.append(" AND ").append(dialect.textDateLessOrEqualParam("cm.meeting_date"));
            params.add(dateTo.trim());
        }
        if (attendeeEmployeeId != null && attendeeEmployeeId > 0) {
            sql.append("""
                     AND EXISTS (
                         SELECT 1 FROM client_meeting_attendee cma
                         WHERE cma.meeting_id = cm.id AND cma.employee_id = ?
                     )
                    """);
            params.add(attendeeEmployeeId);
        }
        if (taskStatus != null && !taskStatus.isBlank()) {
            sql.append("""
                     AND EXISTS (
                         SELECT 1 FROM client_issue ci
                         WHERE ci.meeting_id = cm.id AND ci.status = ?
                     )
                    """);
            params.add(taskStatus.trim());
        }
        if (taskAssigneeEmployeeId != null && taskAssigneeEmployeeId > 0) {
            sql.append("""
                     AND EXISTS (
                         SELECT 1 FROM client_issue ci
                         WHERE ci.meeting_id = cm.id AND ci.assignee_employee_id = ?
                     )
                    """);
            params.add(taskAssigneeEmployeeId);
        }
        appendMeetingScopeClause(sql, params, scopeDepartmentIds);
        sql.append(" ORDER BY cm.meeting_date DESC, cm.id DESC");

        List<MeetingHeaderRow> headers = jdbc.query(
                sql.toString(),
                (rs, rowNum) -> mapHeaderRow(rs),
                params.toArray()
        );
        return attachDetails(headers);
    }

    public List<ClientMeetingSummaryDto> findSummaries(String clientName, List<Long> scopeDepartmentIds) {
        var sql = new StringBuilder("""
                SELECT cm.id, cm.client_id, cm.client_name, cm.title, cm.meeting_date
                FROM client_meeting cm
                WHERE 1=1
                """);
        var params = new ArrayList<Object>();
        if (clientName != null && !clientName.isBlank()) {
            sql.append(" AND ");
            sql.append(dialect.equalsIgnoreCase("cm.client_name"));
            params.add(clientName.trim());
        }
        appendMeetingScopeClause(sql, params, scopeDepartmentIds);
        sql.append(" ORDER BY cm.meeting_date DESC, cm.id DESC");
        return jdbc.query(
                sql.toString(),
                (rs, rowNum) -> new ClientMeetingSummaryDto(
                        rs.getLong("id"),
                        rs.getString("client_name"),
                        rs.getString("title"),
                        rs.getString("meeting_date")
                ),
                params.toArray()
        );
    }

    public Optional<ClientMeetingDto> findById(long id) {
        List<MeetingHeaderRow> headers = jdbc.query(
                """
                SELECT cm.id, cm.client_id, cm.client_name, cm.client_contact_person, cm.title, cm.meeting_date, cm.meeting_time,
                       cm.location, cm.agenda, cm.minutes_body, cm.issues_summary, cm.created_at, cm.updated_at,
                       au.display_name AS created_by_name
                FROM client_meeting cm
                LEFT JOIN auth_user au ON au.id = cm.created_by
                WHERE cm.id = ?
                """,
                (rs, rowNum) -> mapHeaderRow(rs),
                id
        );
        if (headers.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(attachDetails(headers).getFirst());
    }

    public long insert(
            Long clientId,
            String clientName,
            String clientContactPerson,
            String title,
            String meetingDate,
            String meetingTime,
            String location,
            String agenda,
            String minutesBody,
            String issuesSummary,
            Long createdBy,
            String timestamp
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    """
                    INSERT INTO client_meeting (
                        client_id, client_name, client_contact_person, title, meeting_date, meeting_time, location,
                        agenda, minutes_body, issues_summary, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            if (clientId != null) {
                ps.setLong(1, clientId);
            } else {
                ps.setNull(1, java.sql.Types.BIGINT);
            }
            ps.setString(2, clientName);
            ps.setString(3, clientContactPerson);
            ps.setString(4, title);
            ps.setString(5, meetingDate);
            ps.setString(6, meetingTime);
            ps.setString(7, location);
            ps.setString(8, agenda);
            ps.setString(9, minutesBody);
            ps.setString(10, issuesSummary);
            if (createdBy != null && createdBy > 0) {
                ps.setLong(11, createdBy);
            } else {
                ps.setNull(11, java.sql.Types.INTEGER);
            }
            ps.setString(12, timestamp);
            ps.setString(13, timestamp);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "打合せの作成に失敗しました");
    }

    public boolean update(
            long id,
            Long clientId,
            String clientName,
            String clientContactPerson,
            String title,
            String meetingDate,
            String meetingTime,
            String location,
            String agenda,
            String minutesBody,
            String issuesSummary,
            String timestamp
    ) {
        int rows = jdbc.update(
                """
                UPDATE client_meeting SET
                    client_id = ?, client_name = ?, client_contact_person = ?, title = ?, meeting_date = ?, meeting_time = ?,
                    location = ?, agenda = ?, minutes_body = ?, issues_summary = ?, updated_at = ?
                WHERE id = ?
                """,
                clientId,
                clientName,
                clientContactPerson,
                title,
                meetingDate,
                meetingTime,
                location,
                agenda,
                minutesBody,
                issuesSummary,
                timestamp,
                id
        );
        return rows > 0;
    }

    public boolean delete(long id) {
        return jdbc.update("DELETE FROM client_meeting WHERE id = ?", id) > 0;
    }

    public void replaceAttendees(long meetingId, List<AttendeeRow> attendees) {
        jdbc.update("DELETE FROM client_meeting_attendee WHERE meeting_id = ?", meetingId);
        for (AttendeeRow attendee : attendees) {
            jdbc.update(
                    """
                    INSERT INTO client_meeting_attendee (meeting_id, employee_id, note)
                    VALUES (?, ?, ?)
                    """,
                    meetingId,
                    attendee.employeeId(),
                    attendee.note()
            );
        }
    }

    public void replaceTasks(
            long meetingId,
            String clientName,
            List<TaskRow> tasks,
            Long createdBy,
            String timestamp
    ) {
        jdbc.update("DELETE FROM client_issue WHERE meeting_id = ?", meetingId);
        for (TaskRow task : tasks) {
            jdbc.update(
                    """
                    INSERT INTO client_issue (
                        client_name, meeting_id, title, description, status, priority,
                        due_date, assignee_employee_id, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    clientName,
                    meetingId,
                    task.title(),
                    task.description(),
                    task.status(),
                    task.priority(),
                    task.dueDate(),
                    task.assigneeEmployeeId(),
                    createdBy,
                    timestamp,
                    timestamp
            );
        }
    }

    public boolean isAccessible(long meetingId, List<Long> scopeDepartmentIds) {
        if (scopeDepartmentIds == null) {
            return true;
        }
        if (scopeDepartmentIds.isEmpty()) {
            return false;
        }
        var sql = new StringBuilder("""
                SELECT COUNT(DISTINCT cm.id) FROM client_meeting cm
                WHERE cm.id = ?
                  AND (
                      (
                          NOT EXISTS (
                              SELECT 1 FROM client_meeting_attendee cma WHERE cma.meeting_id = cm.id
                          )
                          AND NOT EXISTS (
                              SELECT 1 FROM client_issue ci
                              WHERE ci.meeting_id = cm.id AND ci.assignee_employee_id IS NOT NULL
                          )
                      )
                      OR EXISTS (
                          SELECT 1 FROM client_meeting_attendee cma
                          JOIN employee e ON e.id = cma.employee_id
                          WHERE cma.meeting_id = cm.id
                """);
        var params = new ArrayList<Object>();
        params.add(meetingId);
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, "e");
        sql.append("""
                      )
                      OR EXISTS (
                          SELECT 1 FROM client_issue ci
                          JOIN employee e ON e.id = ci.assignee_employee_id
                          WHERE ci.meeting_id = cm.id
                """);
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, "e");
        sql.append("))");
        Long count = jdbc.queryForObject(sql.toString(), Long.class, params.toArray());
        return count != null && count > 0;
    }

    public boolean exists(long id) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM client_meeting WHERE id = ?",
                Long.class,
                id
        );
        return count != null && count > 0;
    }

    public List<EligibleParticipantDto> findEligibleAttendees(List<Long> scopeDepartmentIds) {
        var sql = new StringBuilder("""
                SELECT e.id, e.employee_code, e.name, d.name AS department_name, e.position
                FROM employee e
                LEFT JOIN department d ON d.id = e.department_id
                WHERE e.work_status != '退職'
                """);
        MasterData.appendEligibleAttendeePositionCondition(sql);
        sql.append("""
                """);
        var params = new ArrayList<Object>();
        appendEmployeeScopeClause(sql, params, scopeDepartmentIds, "e");
        sql.append(" ORDER BY e.employee_code");
        return jdbc.query(
                sql.toString(),
                (rs, rowNum) -> new EligibleParticipantDto(
                        rs.getLong("id"),
                        rs.getString("employee_code"),
                        rs.getString("name"),
                        rs.getString("department_name"),
                        rs.getString("position")
                ),
                params.toArray()
        );
    }

    public boolean employeesExist(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            return true;
        }
        var sql = new StringBuilder("SELECT COUNT(*) FROM employee WHERE id IN (");
        sql.append("?,".repeat(employeeIds.size()));
        sql.setLength(sql.length() - 1);
        sql.append(")");
        Long count = jdbc.queryForObject(sql.toString(), Long.class, employeeIds.toArray());
        return count != null && count == employeeIds.size();
    }

    private MeetingHeaderRow mapHeaderRow(ResultSet rs) throws SQLException {
        return new MeetingHeaderRow(
                rs.getLong("id"),
                readNullableLong(rs, "client_id"),
                rs.getString("client_name"),
                rs.getString("client_contact_person"),
                rs.getString("title"),
                rs.getString("meeting_date"),
                rs.getString("meeting_time"),
                rs.getString("location"),
                rs.getString("agenda"),
                rs.getString("minutes_body"),
                rs.getString("issues_summary"),
                rs.getString("created_by_name"),
                rs.getString("created_at"),
                rs.getString("updated_at")
        );
    }

    private List<ClientMeetingDto> attachDetails(List<MeetingHeaderRow> headers) {
        if (headers.isEmpty()) {
            return List.of();
        }
        List<Long> meetingIds = headers.stream().map(MeetingHeaderRow::id).toList();
        Map<Long, List<ClientMeetingAttendeeDto>> attendeeMap = loadAttendees(meetingIds);
        Map<Long, List<ClientIssueDto>> taskMap = loadTasks(meetingIds);
        List<ClientMeetingDto> result = new ArrayList<>();
        for (MeetingHeaderRow header : headers) {
            result.add(new ClientMeetingDto(
                    header.id(),
                    header.clientId(),
                    header.clientName(),
                    header.clientContactPerson(),
                    header.title(),
                    header.meetingDate(),
                    header.meetingTime(),
                    header.location(),
                    header.agenda(),
                    header.minutesBody(),
                    header.issuesSummary(),
                    header.createdByName(),
                    header.createdAt(),
                    header.updatedAt(),
                    attendeeMap.getOrDefault(header.id(), List.of()),
                    taskMap.getOrDefault(header.id(), List.of())
            ));
        }
        return result;
    }

    private Map<Long, List<ClientMeetingAttendeeDto>> loadAttendees(List<Long> meetingIds) {
        var placeholders = String.join(",", meetingIds.stream().map(id -> "?").toList());
        var sql = """
                SELECT cma.meeting_id, e.id AS employee_id, e.employee_code, e.name,
                       d.name AS department_name, e.position, cma.note
                FROM client_meeting_attendee cma
                JOIN employee e ON e.id = cma.employee_id
                LEFT JOIN department d ON d.id = e.department_id
                WHERE cma.meeting_id IN (%s)
                ORDER BY e.employee_code
                """.formatted(placeholders);
        return jdbc.query(
                sql,
                rs -> {
                    Map<Long, List<ClientMeetingAttendeeDto>> map = new LinkedHashMap<>();
                    while (rs.next()) {
                        long meetingId = rs.getLong("meeting_id");
                        map.computeIfAbsent(meetingId, key -> new ArrayList<>()).add(
                                new ClientMeetingAttendeeDto(
                                        rs.getLong("employee_id"),
                                        rs.getString("employee_code"),
                                        rs.getString("name"),
                                        rs.getString("department_name"),
                                        rs.getString("position"),
                                        rs.getString("note")
                                )
                        );
                    }
                    return map;
                },
                meetingIds.toArray()
        );
    }

    private Map<Long, List<ClientIssueDto>> loadTasks(List<Long> meetingIds) {
        var placeholders = String.join(",", meetingIds.stream().map(id -> "?").toList());
        var sql = """
                SELECT ci.id, ci.client_name, ci.meeting_id, cm.title AS meeting_title,
                       ci.title, ci.description, ci.status, ci.priority, ci.due_date,
                       ci.assignee_employee_id, ae.name AS assignee_name,
                       ad.name AS assignee_department_name, ae.position AS assignee_position,
                       au.display_name AS created_by_name, ci.created_at, ci.updated_at
                FROM client_issue ci
                LEFT JOIN client_meeting cm ON cm.id = ci.meeting_id
                LEFT JOIN employee ae ON ae.id = ci.assignee_employee_id
                LEFT JOIN department ad ON ad.id = ae.department_id
                LEFT JOIN auth_user au ON au.id = ci.created_by
                WHERE ci.meeting_id IN (%s)
                ORDER BY CASE ci.status WHEN '対応中' THEN 0 WHEN '未着手' THEN 1 WHEN '保留' THEN 2 ELSE 3 END,
                         ci.due_date IS NULL, ci.due_date ASC, ci.id ASC
                """.formatted(placeholders);
        return jdbc.query(
                sql,
                rs -> {
                    Map<Long, List<ClientIssueDto>> map = new LinkedHashMap<>();
                    while (rs.next()) {
                        long meetingId = rs.getLong("meeting_id");
                        map.computeIfAbsent(meetingId, key -> new ArrayList<>()).add(mapTask(rs));
                    }
                    return map;
                },
                meetingIds.toArray()
        );
    }

    private ClientIssueDto mapTask(ResultSet rs) throws SQLException {
        long meetingIdValue = rs.getLong("meeting_id");
        Long meetingId = rs.wasNull() ? null : meetingIdValue;
        long assigneeIdValue = rs.getLong("assignee_employee_id");
        Long assigneeEmployeeId = rs.wasNull() ? null : assigneeIdValue;
        return new ClientIssueDto(
                rs.getLong("id"),
                rs.getString("client_name"),
                meetingId,
                rs.getString("meeting_title"),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getString("priority"),
                rs.getString("due_date"),
                assigneeEmployeeId,
                rs.getString("assignee_name"),
                rs.getString("assignee_department_name"),
                rs.getString("assignee_position"),
                rs.getString("created_by_name"),
                rs.getString("created_at"),
                rs.getString("updated_at")
        );
    }

    private void appendMeetingScopeClause(StringBuilder sql, List<Object> params, List<Long> scopeDepartmentIds) {
        if (scopeDepartmentIds == null) {
            return;
        }
        if (scopeDepartmentIds.isEmpty()) {
            sql.append(" AND 1=0");
            return;
        }
        sql.append("""
                 AND (
                     (
                         NOT EXISTS (
                             SELECT 1 FROM client_meeting_attendee cma WHERE cma.meeting_id = cm.id
                         )
                         AND NOT EXISTS (
                             SELECT 1 FROM client_issue ci
                             WHERE ci.meeting_id = cm.id AND ci.assignee_employee_id IS NOT NULL
                         )
                     )
                     OR EXISTS (
                         SELECT 1 FROM client_meeting_attendee cma
                         JOIN employee e ON e.id = cma.employee_id
                         WHERE cma.meeting_id = cm.id
                """);
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, "e");
        sql.append("""
                     )
                     OR EXISTS (
                         SELECT 1 FROM client_issue ci
                         JOIN employee e ON e.id = ci.assignee_employee_id
                         WHERE ci.meeting_id = cm.id
                """);
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, "e");
        sql.append("))");
    }

    private void appendEmployeeScopeClause(
            StringBuilder sql,
            List<Object> params,
            List<Long> scopeDepartmentIds,
            String tableAlias
    ) {
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, tableAlias);
    }

    public record AttendeeRow(long employeeId, String note) {
    }

    public record TaskRow(
            String title,
            String description,
            String status,
            String priority,
            String dueDate,
            Long assigneeEmployeeId
    ) {
    }

    private static Long readNullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record MeetingHeaderRow(
            long id,
            Long clientId,
            String clientName,
            String clientContactPerson,
            String title,
            String meetingDate,
            String meetingTime,
            String location,
            String agenda,
            String minutesBody,
            String issuesSummary,
            String createdByName,
            String createdAt,
            String updatedAt
    ) {
    }
}
