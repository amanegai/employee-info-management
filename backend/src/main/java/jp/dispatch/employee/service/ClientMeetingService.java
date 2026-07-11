package jp.dispatch.employee.service;

import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.DataScopeService;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.ClientMeetingAttendeeRequest;
import jp.dispatch.employee.dto.ClientMeetingDto;
import jp.dispatch.employee.dto.ClientMeetingSaveRequest;
import jp.dispatch.employee.dto.ClientMeetingSummaryDto;
import jp.dispatch.employee.dto.ClientTaskSaveRequest;
import jp.dispatch.employee.dto.EligibleParticipantDto;
import jp.dispatch.employee.model.ClientIssueData;
import jp.dispatch.employee.repository.ClientMeetingRepository;
import jp.dispatch.employee.repository.ClientRepository;
import jp.dispatch.employee.repository.ClientMeetingRepository.AttendeeRow;
import jp.dispatch.employee.repository.ClientMeetingRepository.TaskRow;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class ClientMeetingService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final ClientMeetingRepository repository;
    private final ClientRepository clientRepository;
    private final SecurityService securityService;
    private final DataScopeService dataScopeService;

    public ClientMeetingService(
            ClientMeetingRepository repository,
            ClientRepository clientRepository,
            SecurityService securityService,
            DataScopeService dataScopeService
    ) {
        this.repository = repository;
        this.clientRepository = clientRepository;
        this.securityService = securityService;
        this.dataScopeService = dataScopeService;
    }

    public List<String> getTaskStatuses() {
        requireViewPermission();
        return ClientIssueData.STATUSES;
    }

    public List<String> getTaskPriorities() {
        requireViewPermission();
        return ClientIssueData.PRIORITIES;
    }

    public List<EligibleParticipantDto> getEligibleAttendees() {
        requireViewPermission();
        return repository.findEligibleAttendees(dataScopeService.visibleDepartmentIdsOrNull());
    }

    public List<ClientMeetingSummaryDto> getSummaries(String clientName) {
        requireViewPermission();
        return repository.findSummaries(clientName, dataScopeService.visibleDepartmentIdsOrNull());
    }

    public List<ClientMeetingDto> search(
            String keyword,
            String dateFrom,
            String dateTo,
            Long attendeeEmployeeId,
            String taskStatus,
            Long taskAssigneeEmployeeId
    ) {
        requireViewPermission();
        validateDate(dateFrom, "開始日");
        validateDate(dateTo, "終了日");
        validateTaskStatus(taskStatus);
        return repository.search(
                keyword,
                dateFrom,
                dateTo,
                attendeeEmployeeId,
                taskStatus,
                taskAssigneeEmployeeId,
                dataScopeService.visibleDepartmentIdsOrNull()
        );
    }

    public ClientMeetingDto getById(long id) {
        requireViewPermission();
        repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "議事録が見つかりません"));
        ensureAccessible(id);
        return repository.findById(id).orElseThrow();
    }

    public ClientMeetingDto create(ClientMeetingSaveRequest request) {
        requireWritePermission();
        validateSaveRequest(request);
        String now = timestampNow();
        AppUserDetails user = securityService.currentUser();
        Long createdBy = user != null ? user.getId() : null;
        ResolvedClient client = resolveClient(request.clientId(), request.clientName());
        long id = repository.insert(
                client.clientId(),
                client.clientName(),
                blankToNull(request.clientContactPerson()),
                request.title().trim(),
                request.meetingDate().trim(),
                blankToNull(request.meetingTime()),
                blankToNull(request.location()),
                blankToNull(request.agenda()),
                blankToNull(request.minutesBody()),
                blankToNull(request.issuesSummary()),
                createdBy,
                now
        );
        repository.replaceAttendees(id, toAttendeeRows(request.attendees()));
        repository.replaceTasks(id, client.clientName(), toTaskRows(request.tasks()), createdBy, now);
        return getById(id);
    }

    public ClientMeetingDto update(long id, ClientMeetingSaveRequest request) {
        requireWritePermission();
        ensureAccessible(id);
        validateSaveRequest(request);
        String now = timestampNow();
        AppUserDetails user = securityService.currentUser();
        Long createdBy = user != null ? user.getId() : null;
        ResolvedClient client = resolveClient(request.clientId(), request.clientName());
        boolean updated = repository.update(
                id,
                client.clientId(),
                client.clientName(),
                blankToNull(request.clientContactPerson()),
                request.title().trim(),
                request.meetingDate().trim(),
                blankToNull(request.meetingTime()),
                blankToNull(request.location()),
                blankToNull(request.agenda()),
                blankToNull(request.minutesBody()),
                blankToNull(request.issuesSummary()),
                now
        );
        if (!updated) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "議事録が見つかりません");
        }
        repository.replaceAttendees(id, toAttendeeRows(request.attendees()));
        repository.replaceTasks(id, client.clientName(), toTaskRows(request.tasks()), createdBy, now);
        return getById(id);
    }

    public void delete(long id) {
        requireWritePermission();
        ensureAccessible(id);
        if (!repository.delete(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "議事録が見つかりません");
        }
    }

    private ResolvedClient resolveClient(Long clientId, String clientName) {
        if (clientId != null) {
            if (!clientRepository.activeClientExists(clientId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "選択した取引先が見つかりません");
            }
            String masterName = clientRepository.findActiveClientName(clientId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "選択した取引先が見つかりません"));
            return new ResolvedClient(clientId, masterName);
        }
        if (isBlank(clientName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "取引先名を入力してください");
        }
        return new ResolvedClient(null, clientName.trim());
    }

    private void ensureAccessible(long id) {
        if (!repository.isAccessible(id, dataScopeService.visibleDepartmentIdsOrNull())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この議事録を閲覧する権限がありません");
        }
    }

    private void validateSaveRequest(ClientMeetingSaveRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "リクエストが不正です");
        }
        if (request.clientId() == null && isBlank(request.clientName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "取引先名を入力してください");
        }
        if (isBlank(request.title())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "件名を入力してください");
        }
        if (isBlank(request.meetingDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "打合せ日を入力してください");
        }
        validateDate(request.meetingDate(), "打合せ日");
        List<Long> attendeeIds = extractAttendeeEmployeeIds(request.attendees());
        List<Long> assigneeIds = extractTaskAssigneeIds(request.tasks());
        List<Long> allEmployeeIds = new ArrayList<>();
        allEmployeeIds.addAll(attendeeIds);
        allEmployeeIds.addAll(assigneeIds);
        if (!allEmployeeIds.isEmpty() && !repository.employeesExist(allEmployeeIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "存在しない社員が含まれています");
        }
        validateTasks(request.tasks());
    }

    private void validateTasks(List<ClientTaskSaveRequest> tasks) {
        if (tasks == null) {
            return;
        }
        for (ClientTaskSaveRequest task : tasks) {
            if (task == null || isBlank(task.title())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "タスク名を入力してください");
            }
            validateTaskStatus(task.status());
            validateTaskPriority(task.priority());
            validateDate(task.dueDate(), "タスク期限");
        }
    }

    private List<AttendeeRow> toAttendeeRows(List<ClientMeetingAttendeeRequest> attendees) {
        if (attendees == null || attendees.isEmpty()) {
            return List.of();
        }
        List<AttendeeRow> rows = new ArrayList<>();
        Set<Long> seen = new LinkedHashSet<>();
        for (ClientMeetingAttendeeRequest attendee : attendees) {
            if (attendee == null || attendee.employeeId() == null || attendee.employeeId() <= 0) {
                continue;
            }
            if (!seen.add(attendee.employeeId())) {
                continue;
            }
            rows.add(new AttendeeRow(attendee.employeeId(), blankToNull(attendee.note())));
        }
        return rows;
    }

    private List<TaskRow> toTaskRows(List<ClientTaskSaveRequest> tasks) {
        if (tasks == null || tasks.isEmpty()) {
            return List.of();
        }
        List<TaskRow> rows = new ArrayList<>();
        for (ClientTaskSaveRequest task : tasks) {
            if (task == null || isBlank(task.title())) {
                continue;
            }
            Long assigneeId = task.assigneeEmployeeId() != null && task.assigneeEmployeeId() > 0
                    ? task.assigneeEmployeeId()
                    : null;
            rows.add(new TaskRow(
                    task.title().trim(),
                    blankToNull(task.description()),
                    normalizeTaskStatus(task.status()),
                    normalizeTaskPriority(task.priority()),
                    blankToNull(task.dueDate()),
                    assigneeId
            ));
        }
        return rows;
    }

    private List<Long> extractAttendeeEmployeeIds(List<ClientMeetingAttendeeRequest> attendees) {
        return toAttendeeRows(attendees).stream().map(AttendeeRow::employeeId).toList();
    }

    private List<Long> extractTaskAssigneeIds(List<ClientTaskSaveRequest> tasks) {
        return toTaskRows(tasks).stream()
                .map(TaskRow::assigneeEmployeeId)
                .filter(id -> id != null && id > 0)
                .toList();
    }

    private void validateDate(String value, String label) {
        if (isBlank(value)) {
            return;
        }
        try {
            LocalDate.parse(value.trim());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "の形式が不正です");
        }
    }

    private void validateTaskStatus(String status) {
        if (isBlank(status)) {
            return;
        }
        if (!ClientIssueData.STATUSES.contains(status.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "タスクステータスが不正です");
        }
    }

    private void validateTaskPriority(String priority) {
        if (isBlank(priority)) {
            return;
        }
        if (!ClientIssueData.PRIORITIES.contains(priority.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "タスク優先度が不正です");
        }
    }

    private String normalizeTaskStatus(String status) {
        return isBlank(status) ? "未着手" : status.trim();
    }

    private String normalizeTaskPriority(String priority) {
        return isBlank(priority) ? "中" : priority.trim();
    }

    private void requireViewPermission() {
        if (!securityService.canViewClientRecords()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "取引先議事録を閲覧する権限がありません");
        }
    }

    private void requireWritePermission() {
        if (!securityService.canWriteClientRecords()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "取引先議事録を編集する権限がありません");
        }
    }

    private static String timestampNow() {
        return LocalDateTime.now().format(TIMESTAMP);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record ResolvedClient(Long clientId, String clientName) {
    }
}
