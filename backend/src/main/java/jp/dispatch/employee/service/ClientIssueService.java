package jp.dispatch.employee.service;

import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.DataScopeService;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.ClientIssueDto;
import jp.dispatch.employee.dto.ClientIssueSaveRequest;
import jp.dispatch.employee.dto.EligibleParticipantDto;
import jp.dispatch.employee.model.ClientIssueData;
import jp.dispatch.employee.repository.ClientIssueRepository;
import jp.dispatch.employee.repository.ClientMeetingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ClientIssueService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final ClientIssueRepository repository;
    private final ClientMeetingRepository meetingRepository;
    private final SecurityService securityService;
    private final DataScopeService dataScopeService;

    public ClientIssueService(
            ClientIssueRepository repository,
            ClientMeetingRepository meetingRepository,
            SecurityService securityService,
            DataScopeService dataScopeService
    ) {
        this.repository = repository;
        this.meetingRepository = meetingRepository;
        this.securityService = securityService;
        this.dataScopeService = dataScopeService;
    }

    public List<String> getStatuses() {
        requireViewPermission();
        return ClientIssueData.STATUSES;
    }

    public List<String> getPriorities() {
        requireViewPermission();
        return ClientIssueData.PRIORITIES;
    }

    public List<EligibleParticipantDto> getEligibleAssignees() {
        requireViewPermission();
        return repository.findEligibleAssignees(dataScopeService.visibleDepartmentIdsOrNull());
    }

    public List<ClientIssueDto> search(
            String keyword,
            String status,
            String priority,
            String dateFrom,
            String dateTo,
            Long assigneeEmployeeId,
            Long meetingId
    ) {
        requireViewPermission();
        validateDate(dateFrom, "期限開始日");
        validateDate(dateTo, "期限終了日");
        validateStatus(status);
        validatePriority(priority);
        return repository.search(
                keyword,
                status,
                priority,
                dateFrom,
                dateTo,
                assigneeEmployeeId,
                meetingId,
                dataScopeService.visibleDepartmentIdsOrNull()
        );
    }

    public ClientIssueDto getById(long id) {
        requireViewPermission();
        repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "課題が見つかりません"));
        ensureAccessible(id);
        return repository.findById(id).orElseThrow();
    }

    public ClientIssueDto create(ClientIssueSaveRequest request) {
        requireWritePermission();
        validateSaveRequest(request);
        String now = timestampNow();
        AppUserDetails user = securityService.currentUser();
        Long createdBy = user != null ? user.getId() : null;
        long id = repository.insert(
                request.clientName().trim(),
                normalizeMeetingId(request.meetingId()),
                request.title().trim(),
                blankToNull(request.description()),
                normalizeStatus(request.status()),
                normalizePriority(request.priority()),
                blankToNull(request.dueDate()),
                normalizeAssigneeId(request.assigneeEmployeeId()),
                createdBy,
                now
        );
        return getById(id);
    }

    public ClientIssueDto update(long id, ClientIssueSaveRequest request) {
        requireWritePermission();
        ensureAccessible(id);
        validateSaveRequest(request);
        boolean updated = repository.update(
                id,
                request.clientName().trim(),
                normalizeMeetingId(request.meetingId()),
                request.title().trim(),
                blankToNull(request.description()),
                normalizeStatus(request.status()),
                normalizePriority(request.priority()),
                blankToNull(request.dueDate()),
                normalizeAssigneeId(request.assigneeEmployeeId()),
                timestampNow()
        );
        if (!updated) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "課題が見つかりません");
        }
        return getById(id);
    }

    public void delete(long id) {
        requireWritePermission();
        ensureAccessible(id);
        if (!repository.delete(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "課題が見つかりません");
        }
    }

    private void ensureAccessible(long id) {
        if (!repository.isAccessible(id, dataScopeService.visibleDepartmentIdsOrNull())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この課題を閲覧する権限がありません");
        }
    }

    private void validateSaveRequest(ClientIssueSaveRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "リクエストが不正です");
        }
        if (isBlank(request.clientName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "取引先名を入力してください");
        }
        if (isBlank(request.title())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "課題名を入力してください");
        }
        validateStatus(request.status());
        validatePriority(request.priority());
        validateDate(request.dueDate(), "期限");
        Long meetingId = normalizeMeetingId(request.meetingId());
        if (meetingId != null) {
            if (!meetingRepository.exists(meetingId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "関連議事録が存在しません");
            }
            if (!meetingRepository.isAccessible(meetingId, dataScopeService.visibleDepartmentIdsOrNull())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "関連議事録を参照する権限がありません");
            }
        }
        Long assigneeId = normalizeAssigneeId(request.assigneeEmployeeId());
        if (assigneeId != null && !repository.employeeExists(assigneeId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "担当者が存在しません");
        }
    }

    private void validateStatus(String status) {
        if (isBlank(status)) {
            return;
        }
        if (!ClientIssueData.STATUSES.contains(status.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ステータスが不正です");
        }
    }

    private void validatePriority(String priority) {
        if (isBlank(priority)) {
            return;
        }
        if (!ClientIssueData.PRIORITIES.contains(priority.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "優先度が不正です");
        }
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

    private String normalizeStatus(String status) {
        return isBlank(status) ? "未着手" : status.trim();
    }

    private String normalizePriority(String priority) {
        return isBlank(priority) ? "中" : priority.trim();
    }

    private Long normalizeMeetingId(Long meetingId) {
        return meetingId != null && meetingId > 0 ? meetingId : null;
    }

    private Long normalizeAssigneeId(Long assigneeEmployeeId) {
        return assigneeEmployeeId != null && assigneeEmployeeId > 0 ? assigneeEmployeeId : null;
    }

    private void requireViewPermission() {
        if (!securityService.canViewClientRecords()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "取引先課題を閲覧する権限がありません");
        }
    }

    private void requireWritePermission() {
        if (!securityService.canWriteClientRecords()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "取引先課題を編集する権限がありません");
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
}
