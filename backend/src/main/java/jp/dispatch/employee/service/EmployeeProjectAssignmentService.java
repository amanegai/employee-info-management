package jp.dispatch.employee.service;

import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.AssignmentCancelRequest;
import jp.dispatch.employee.dto.AssignmentUpdateRequest;
import jp.dispatch.employee.dto.EmployeeProjectAssignmentDto;
import jp.dispatch.employee.repository.DispatchProjectRepository;
import jp.dispatch.employee.repository.EmployeeProjectAssignmentRepository;
import jp.dispatch.employee.repository.EmployeeProjectAssignmentRepository.AssignmentRow;
import jp.dispatch.employee.repository.EmployeeRepository;
import jp.dispatch.employee.repository.EmployeeRepository.EmployeeStatusRow;
import jp.dispatch.employee.repository.EmployeeStatusChangeLogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

@Service
public class EmployeeProjectAssignmentService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");
    private static final Set<String> EDITABLE_STATUSES = Set.of("PLANNED", "ACTIVE");

    private final EmployeeProjectAssignmentRepository assignmentRepository;
    private final EmployeeRepository employeeRepository;
    private final DispatchProjectRepository projectRepository;
    private final EmployeeStatusChangeLogRepository statusLogRepository;
    private final AssignmentCancelFollowupService followupService;
    private final SecurityService securityService;
    private final AuditLogService auditLogService;

    @Value("${app.employee-status.ending-soon-days:30}")
    private int endingSoonDays;

    public EmployeeProjectAssignmentService(
            EmployeeProjectAssignmentRepository assignmentRepository,
            EmployeeRepository employeeRepository,
            DispatchProjectRepository projectRepository,
            EmployeeStatusChangeLogRepository statusLogRepository,
            AssignmentCancelFollowupService followupService,
            SecurityService securityService,
            AuditLogService auditLogService
    ) {
        this.assignmentRepository = assignmentRepository;
        this.employeeRepository = employeeRepository;
        this.projectRepository = projectRepository;
        this.statusLogRepository = statusLogRepository;
        this.followupService = followupService;
        this.securityService = securityService;
        this.auditLogService = auditLogService;
    }

    public List<EmployeeProjectAssignmentDto> listByEmployee(long employeeId) {
        requireViewProjectPermission();
        if (employeeRepository.findById(employeeId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません");
        }
        return assignmentRepository.findByEmployeeId(employeeId);
    }

    @Transactional
    public EmployeeProjectAssignmentDto update(long id, AssignmentUpdateRequest request) {
        requireWritePermission();
        AssignmentRow assignment = assignmentRepository.findRowById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "配属が見つかりません"));
        if (!EDITABLE_STATUSES.contains(assignment.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "この配属は編集できません");
        }

        String startDate = request.startDate() != null && !request.startDate().isBlank()
                ? request.startDate().trim()
                : assignment.startDate();
        String endDate = request.endDate() != null
                ? blankToNull(request.endDate())
                : assignment.endDate();
        validateDate(startDate, "配属開始日");
        validateDate(endDate, "配属終了日");

        String now = timestampNow();
        String oldEndDate = assignment.endDate();
        assignmentRepository.updateDatesAndNotes(id, startDate, endDate, blankToNull(request.notes()), now);

        if ("ACTIVE".equals(assignment.status()) && endDate != null && !endDate.equals(oldEndDate)) {
            applyExtensionRule(assignment.employeeId(), assignment.id(), endDate, now);
        }

        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "配属が見つかりません"));
    }

    @Transactional
    public EmployeeProjectAssignmentDto cancel(long id, AssignmentCancelRequest request) {
        requireWritePermission();
        AssignmentRow assignment = assignmentRepository.findRowById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "配属が見つかりません"));
        if (!EDITABLE_STATUSES.contains(assignment.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "この配属は取消できません");
        }

        String now = timestampNow();
        assignmentRepository.cancel(id, now);
        projectRepository.decrementHeadcountFilled(assignment.projectId(), now);

        EmployeeStatusRow employee = employeeRepository.findStatusById(assignment.employeeId()).orElse(null);
        String currentWorkStatus = employee != null && employee.workStatus() != null && !employee.workStatus().isBlank()
                ? employee.workStatus()
                : "不明";
        String currentEndDate = employee != null ? employee.endDate() : null;

        AppUserDetails user = securityService.currentUser();
        statusLogRepository.insert(
                assignment.employeeId(),
                currentWorkStatus,
                currentWorkStatus,
                currentEndDate,
                currentEndDate,
                "ASSIGNMENT_CANCEL",
                id,
                "配属取消: " + assignment.projectName()
                        + (request != null && request.cancelReason() != null ? " (" + request.cancelReason() + ")" : ""),
                user != null ? user.getId() : null
        );

        String cancelReason = request != null && request.cancelReason() != null
                ? request.cancelReason().trim()
                : "MANUAL";
        followupService.createOnAssignmentCancel(
                assignment,
                cancelReason,
                user != null ? user.getId() : null
        );

        auditLogService.log(
                AuditAction.ASSIGNMENT_CANCEL,
                "employee_project_assignment",
                String.valueOf(id),
                assignment.projectName() + " / employee=" + assignment.employeeId()
        );
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "配属が見つかりません"));
    }

    private void applyExtensionRule(long employeeId, long assignmentId, String newEndDate, String now) {
        EmployeeStatusRow employee = employeeRepository.findStatusById(employeeId).orElse(null);
        if (employee == null || !"案件終了間近".equals(employee.workStatus())) {
            return;
        }

        LocalDate today = LocalDate.now(ZONE);
        LocalDate end = LocalDate.parse(newEndDate);
        LocalDate threshold = today.plusDays(endingSoonDays);
        AppUserDetails user = securityService.currentUser();
        Long userId = user != null ? user.getId() : null;

        if (end.isAfter(threshold)) {
            employeeRepository.updateWorkStatusAndEndDate(employeeId, "稼働中", null);
            statusLogRepository.insert(
                    employeeId,
                    employee.workStatus(),
                    "稼働中",
                    employee.endDate(),
                    null,
                    "ASSIGNMENT_EXTEND",
                    assignmentId,
                    "現案件延長により終了間近解除",
                    userId
            );
        } else {
            employeeRepository.updateWorkStatusAndEndDate(employeeId, "案件終了間近", newEndDate);
            statusLogRepository.insert(
                    employeeId,
                    employee.workStatus(),
                    "案件終了間近",
                    employee.endDate(),
                    newEndDate,
                    "ASSIGNMENT_EXTEND",
                    assignmentId,
                    "現案件延長（終了間近継続）",
                    userId
            );
        }
    }

    private void validateDate(String value, String label) {
        if (value == null || value.isBlank()) {
            return;
        }
        try {
            LocalDate.parse(value.trim());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "の形式が不正です");
        }
    }

    private void requireViewProjectPermission() {
        if (!securityService.canViewProjectFeatures()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "案件機能の閲覧権限がありません");
        }
    }

    private void requireWritePermission() {
        if (!securityService.canWriteProjectFeatures()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "編集権限がありません");
        }
    }

    private static String timestampNow() {
        return LocalDateTime.now(ZONE).format(TIMESTAMP);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
