package jp.dispatch.employee.service;

import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.EmployeeStatusMaintenanceResultDto;
import jp.dispatch.employee.dto.EmployeeStatusSuggestionDto;
import jp.dispatch.employee.repository.EmployeeProjectAssignmentRepository;
import jp.dispatch.employee.repository.EmployeeProjectAssignmentRepository.AssignmentRow;
import jp.dispatch.employee.repository.EmployeeRepository;
import jp.dispatch.employee.repository.EmployeeRepository.EmployeeStatusRow;
import jp.dispatch.employee.repository.EmployeeStatusChangeLogRepository;
import jp.dispatch.employee.repository.EmployeeStatusSuggestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class EmployeeStatusMaintenanceService {

    private static final Logger log = LoggerFactory.getLogger(EmployeeStatusMaintenanceService.class);
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private final EmployeeProjectAssignmentRepository assignmentRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeStatusChangeLogRepository statusLogRepository;
    private final EmployeeStatusSuggestionRepository suggestionRepository;
    private final SecurityService securityService;
    private final AuditLogService auditLogService;

    @Value("${app.employee-status.maintenance.enabled:true}")
    private boolean maintenanceEnabled;

    @Value("${app.employee-status.auto-apply:false}")
    private boolean autoApply;

    @Value("${app.employee-status.ending-soon-days:30}")
    private int endingSoonDays;

    public EmployeeStatusMaintenanceService(
            EmployeeProjectAssignmentRepository assignmentRepository,
            EmployeeRepository employeeRepository,
            EmployeeStatusChangeLogRepository statusLogRepository,
            EmployeeStatusSuggestionRepository suggestionRepository,
            SecurityService securityService,
            AuditLogService auditLogService
    ) {
        this.assignmentRepository = assignmentRepository;
        this.employeeRepository = employeeRepository;
        this.statusLogRepository = statusLogRepository;
        this.suggestionRepository = suggestionRepository;
        this.securityService = securityService;
        this.auditLogService = auditLogService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (maintenanceEnabled) {
            runMaintenance("startup");
        }
    }

    @Scheduled(cron = "${app.employee-status.maintenance-cron:0 30 1 * * *}", zone = "Asia/Tokyo")
    public void scheduledMaintenance() {
        if (maintenanceEnabled) {
            runMaintenance("scheduled");
        }
    }

    @Transactional
    public EmployeeStatusMaintenanceResultDto runMaintenance(String trigger) {
        if (!maintenanceEnabled) {
            return new EmployeeStatusMaintenanceResultDto(0, 0, 0);
        }

        String today = LocalDate.now(ZONE).toString();
        String endingThreshold = LocalDate.now(ZONE).plusDays(endingSoonDays).toString();
        String now = LocalDateTime.now(ZONE).format(TIMESTAMP);

        MaintenanceCounters counters = new MaintenanceCounters();
        Set<Long> processedEmployees = new HashSet<>();

        for (AssignmentRow planned : assignmentRepository.findAllPrimaryPlannedDue(today)) {
            if (!processedEmployees.add(planned.employeeId())) {
                continue;
            }
            EmployeeStatusRow employee = employeeRepository.findStatusById(planned.employeeId()).orElse(null);
            if (employee == null) {
                continue;
            }

            assignmentRepository.findPrimaryActive(planned.employeeId()).ifPresent(active -> {
                if (shouldCompleteBeforeSwitch(active, planned.startDate(), today)) {
                    assignmentRepository.complete(active.id(), now);
                    counters.assignmentsUpdated++;
                }
            });

            assignmentRepository.activate(planned.id(), now);
            counters.assignmentsUpdated++;

            if ("案件終了間近".equals(employee.workStatus()) || "待機中".equals(employee.workStatus())) {
                applyOrSuggest(
                        employee,
                        "稼働中",
                        null,
                        "ASSIGNMENT_START",
                        planned.id(),
                        "確定済みの次案件の開始日になったため、「稼働中」への変更をおすすめします。",
                        now,
                        counters,
                        null
                );
            }
        }

        for (EmployeeStatusRow employee : employeeRepository.findAllForMaintenance()) {
            if (processedEmployees.contains(employee.id())) {
                continue;
            }
            if (!"稼働中".equals(employee.workStatus())) {
                continue;
            }
            if (assignmentRepository.hasFuturePlannedPrimary(employee.id(), today)) {
                continue;
            }
            AssignmentRow active = assignmentRepository.findPrimaryActive(employee.id()).orElse(null);
            if (active == null || active.endDate() == null || active.endDate().isBlank()) {
                continue;
            }
            if (active.endDate().compareTo(endingThreshold) <= 0) {
                applyOrSuggest(
                        employee,
                        "案件終了間近",
                        active.endDate(),
                        "SCHEDULED",
                        active.id(),
                        "現在の案件の終了予定日が近づいています。「案件終了間近」への変更をおすすめします。下家案件のマッチングや、現案件の延長の有無をご確認ください。",
                        now,
                        counters,
                        null
                );
            }
        }

        for (EmployeeStatusRow employee : employeeRepository.findAllForMaintenance()) {
            if (!"案件終了間近".equals(employee.workStatus())) {
                continue;
            }
            if (assignmentRepository.hasFuturePlannedPrimary(employee.id(), today)) {
                continue;
            }
            AssignmentRow active = assignmentRepository.findPrimaryActive(employee.id()).orElse(null);
            if (active == null || active.endDate() == null || active.endDate().compareTo(today) >= 0) {
                continue;
            }
            if (assignmentRepository.findPrimaryPlannedDue(employee.id(), today).isPresent()) {
                continue;
            }

            assignmentRepository.complete(active.id(), now);
            counters.assignmentsUpdated++;
            applyOrSuggest(
                    employee,
                    "待機中",
                    null,
                    "ASSIGNMENT_END",
                    active.id(),
                    "現在の案件が終了し、次の案件がまだ未確定です。「待機中」への変更をおすすめします。",
                    now,
                    counters,
                    null
            );
        }

        if (counters.suggestionsCreated > 0 || counters.statusChangesApplied > 0 || counters.assignmentsUpdated > 0) {
            log.info(
                    "[{}] 社員状態メンテナンス suggestions={} applied={} assignments={}",
                    trigger,
                    counters.suggestionsCreated,
                    counters.statusChangesApplied,
                    counters.assignmentsUpdated
            );
        }

        return new EmployeeStatusMaintenanceResultDto(
                counters.suggestionsCreated,
                counters.statusChangesApplied,
                counters.assignmentsUpdated
        );
    }

    public List<EmployeeStatusSuggestionDto> listSuggestions(String status) {
        requireWritePermission();
        return suggestionRepository.findByStatus(status != null ? status : "PENDING");
    }

    @Transactional
    public EmployeeStatusSuggestionDto applySuggestion(long id) {
        requireWritePermission();
        EmployeeStatusSuggestionDto suggestion = suggestionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "提案が見つかりません"));
        if (!"PENDING".equals(suggestion.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "この提案は既に処理済みです");
        }

        String now = LocalDateTime.now(ZONE).format(TIMESTAMP);
        AppUserDetails user = securityService.currentUser();
        Long userId = user != null ? user.getId() : null;

        employeeRepository.updateWorkStatusAndEndDate(
                suggestion.employeeId(),
                suggestion.suggestedStatus(),
                suggestion.suggestedEndDate()
        );
        statusLogRepository.insert(
                suggestion.employeeId(),
                suggestion.currentWorkStatus(),
                suggestion.suggestedStatus(),
                suggestion.currentEndDate(),
                suggestion.suggestedEndDate(),
                "SUGGESTION_APPLY",
                suggestion.sourceAssignmentId(),
                suggestion.reason(),
                userId
        );
        suggestionRepository.resolve(id, "APPLIED", userId, now);
        auditLogService.log(
                AuditAction.SUGGESTION_APPLY,
                "employee_status_suggestion",
                String.valueOf(id),
                suggestion.employeeName() + ": " + suggestion.currentWorkStatus() + " -> " + suggestion.suggestedStatus()
        );
        return suggestionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "提案が見つかりません"));
    }

    @Transactional
    public EmployeeStatusSuggestionDto dismissSuggestion(long id) {
        requireWritePermission();
        EmployeeStatusSuggestionDto suggestion = suggestionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "提案が見つかりません"));
        if (!"PENDING".equals(suggestion.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "この提案は既に処理済みです");
        }
        String now = LocalDateTime.now(ZONE).format(TIMESTAMP);
        AppUserDetails user = securityService.currentUser();
        suggestionRepository.resolve(id, "DISMISSED", user != null ? user.getId() : null, now);
        auditLogService.log(
                AuditAction.SUGGESTION_DISMISS,
                "employee_status_suggestion",
                String.valueOf(id),
                suggestion.employeeName()
        );
        return suggestionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "提案が見つかりません"));
    }

    public EmployeeStatusMaintenanceResultDto runMaintenanceManual() {
        requireManageUsersPermission();
        EmployeeStatusMaintenanceResultDto result = runMaintenance("manual");
        auditLogService.log(
                AuditAction.STATUS_MAINTENANCE,
                "employee_status",
                null,
                "suggestions=" + result.suggestionsCreated()
                        + " applied=" + result.statusChangesApplied()
                        + " assignments=" + result.assignmentsUpdated()
        );
        return result;
    }

    private void applyOrSuggest(
            EmployeeStatusRow employee,
            String newStatus,
            String newEndDate,
            String triggerType,
            long refId,
            String reason,
            String now,
            MaintenanceCounters counters,
            Long appliedBy
    ) {
        if (newStatus.equals(employee.workStatus())
                && ((newEndDate == null && employee.endDate() == null)
                || (newEndDate != null && newEndDate.equals(employee.endDate())))) {
            return;
        }

        if (autoApply) {
            statusLogRepository.insert(
                    employee.id(),
                    employee.workStatus(),
                    newStatus,
                    employee.endDate(),
                    newEndDate,
                    triggerType,
                    refId,
                    reason,
                    appliedBy
            );
            employeeRepository.updateWorkStatusAndEndDate(employee.id(), newStatus, newEndDate);
            counters.statusChangesApplied++;
        } else if (!suggestionRepository.hasPendingDuplicate(employee.id(), newStatus, reason)) {
            suggestionRepository.insertPending(
                    employee.id(),
                    newStatus,
                    newEndDate,
                    reason,
                    refId,
                    now
            );
            counters.suggestionsCreated++;
        }
    }

    private static boolean shouldCompleteBeforeSwitch(AssignmentRow active, String plannedStartDate, String today) {
        if (active.endDate() == null || active.endDate().isBlank()) {
            return true;
        }
        return active.endDate().compareTo(plannedStartDate) <= 0 || active.endDate().compareTo(today) <= 0;
    }

    private void requireWritePermission() {
        if (!securityService.canWriteProjectFeatures()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "編集権限がありません");
        }
    }

    private void requireManageUsersPermission() {
        if (!securityService.canManageUsers()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "管理者権限がありません");
        }
    }

    private static final class MaintenanceCounters {
        private int suggestionsCreated;
        private int statusChangesApplied;
        private int assignmentsUpdated;
    }
}
