package jp.dispatch.employee.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.CandidateConfirmRequest;
import jp.dispatch.employee.dto.CandidateStageRequest;
import jp.dispatch.employee.dto.ProjectCandidateDto;
import jp.dispatch.employee.dto.ProjectCandidateSaveRequest;
import jp.dispatch.employee.model.ProjectWorkflowData;
import jp.dispatch.employee.repository.DispatchProjectRepository;
import jp.dispatch.employee.repository.EmployeeProjectAssignmentRepository;
import jp.dispatch.employee.repository.EmployeeRepository;
import jp.dispatch.employee.repository.EmployeeStatusChangeLogRepository;
import jp.dispatch.employee.repository.ProjectCandidateRepository;
import jp.dispatch.employee.repository.ProjectCandidateRepository.CandidateRow;
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
import java.util.Map;
import java.util.Set;

@Service
public class ProjectCandidateService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private static final Map<String, Set<String>> STAGE_TRANSITIONS = Map.of(
            "MATCHED", Set.of("PROPOSED", "WITHDRAWN"),
            "PROPOSED", Set.of("INTERVIEW_SCHEDULED", "WITHDRAWN"),
            "INTERVIEW_SCHEDULED", Set.of("INTERVIEWING", "WITHDRAWN"),
            "INTERVIEWING", Set.of("REJECTED", "WITHDRAWN")
    );

    private final ProjectCandidateRepository candidateRepository;
    private final DispatchProjectRepository projectRepository;
    private final EmployeeProjectAssignmentRepository assignmentRepository;
    private final EmployeeStatusChangeLogRepository statusLogRepository;
    private final EmployeeRepository employeeRepository;
    private final SecurityService securityService;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;

    @Value("${app.project-candidate.allow-direct-confirm:true}")
    private boolean allowDirectConfirm;

    public ProjectCandidateService(
            ProjectCandidateRepository candidateRepository,
            DispatchProjectRepository projectRepository,
            EmployeeProjectAssignmentRepository assignmentRepository,
            EmployeeStatusChangeLogRepository statusLogRepository,
            EmployeeRepository employeeRepository,
            SecurityService securityService,
            ObjectMapper objectMapper,
            AuditLogService auditLogService
    ) {
        this.candidateRepository = candidateRepository;
        this.projectRepository = projectRepository;
        this.assignmentRepository = assignmentRepository;
        this.statusLogRepository = statusLogRepository;
        this.employeeRepository = employeeRepository;
        this.securityService = securityService;
        this.objectMapper = objectMapper;
        this.auditLogService = auditLogService;
    }

    public List<String> getCandidateStages() {
        requireViewProjectPermission();
        return ProjectWorkflowData.CANDIDATE_STAGES;
    }

    public List<ProjectCandidateDto> listByProject(long projectId) {
        requireViewProjectPermission();
        ensureProjectExists(projectId);
        return candidateRepository.findByProjectId(projectId);
    }

    public List<ProjectCandidateDto> listByEmployee(long employeeId) {
        requireViewProjectPermission();
        if (employeeRepository.findById(employeeId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません");
        }
        return candidateRepository.findByEmployeeId(employeeId);
    }

    public ProjectCandidateDto addToProject(long projectId, ProjectCandidateSaveRequest request) {
        requireWritePermission();
        ensureMatchableProject(projectId);
        if (request.employeeId() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "社員IDが不正です");
        }
        if (employeeRepository.findById(request.employeeId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません");
        }
        if (candidateRepository.existsInProject(projectId, request.employeeId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "この社員は既に候補に追加されています");
        }
        AppUserDetails user = securityService.currentUser();
        String now = timestampNow();
        long candidateId = candidateRepository.insert(
                projectId,
                request.employeeId(),
                request.matchScore(),
                DispatchProjectService.skillsToJson(request.matchedSkills(), objectMapper),
                blankToNull(request.notes()),
                user != null ? user.getId() : null,
                now
        );
        return candidateRepository.findByProjectId(projectId).stream()
                .filter(candidate -> candidate.id() == candidateId)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "候補の追加に失敗しました"));
    }

    public ProjectCandidateDto updateStage(long candidateId, CandidateStageRequest request) {
        requireWritePermission();
        CandidateRow candidate = loadCandidate(candidateId);
        if (request.stage() == null || request.stage().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ステージは必須です");
        }
        String newStage = request.stage().trim();
        validateStageTransition(candidate.stage(), newStage);
        validateDate(request.interviewAt(), "面接日");
        candidateRepository.updateStage(
                candidateId,
                newStage,
                blankToNull(request.notes()),
                blankToNull(request.interviewAt()),
                timestampNow()
        );
        return findDtoById(candidateId);
    }

    @Transactional
    public ProjectCandidateDto confirmHire(long candidateId, CandidateConfirmRequest request) {
        requireWritePermission();
        CandidateRow candidate = loadCandidate(candidateId);
        if (!allowDirectConfirm && !"OFFERED".equals(candidate.stage())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "選考中の候補のみ採用確定できます");
        }
        if (!Set.of("INTERVIEWING", "OFFERED").contains(candidate.stage())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "選考中の候補のみ採用確定できます");
        }
        if (request.startDate() == null || request.startDate().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "配属開始日は必須です");
        }
        validateDate(request.startDate(), "配属開始日");
        validateDate(request.endDate(), "配属終了日");

        var project = projectRepository.findHeaderById(candidate.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
        if (!project.headcountUnlimited() && project.headcountFilled() >= project.headcountRequired()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "この案件は既に満員です");
        }
        if (assignmentRepository.hasOpenPrimaryAssignment(candidate.employeeId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "他案件で先に確定済みです");
        }

        String now = timestampNow();
        AppUserDetails user = securityService.currentUser();
        Long userId = user != null ? user.getId() : null;

        candidateRepository.markConfirmed(candidateId, now);
        long assignmentId = assignmentRepository.insertPlanned(
                candidate.employeeId(),
                candidate.projectId(),
                candidateId,
                project.clientName(),
                project.projectName(),
                request.startDate().trim(),
                blankToNull(request.endDate()),
                blankToNull(request.notes()),
                userId,
                now,
                now
        );
        candidateRepository.markLostForEmployeeExcept(candidate.employeeId(), candidateId, now);
        projectRepository.incrementHeadcountFilled(candidate.projectId(), now);

        statusLogRepository.insert(
                candidate.employeeId(),
                candidate.workStatus(),
                candidate.workStatus(),
                null,
                null,
                "CONFIRM_HIRE",
                assignmentId,
                "案件「" + project.projectName() + "」で採用確定",
                userId
        );

        auditLogService.log(
                AuditAction.CONFIRM_HIRE,
                "project_candidate",
                String.valueOf(candidateId),
                project.projectName() + " / employee=" + candidate.employeeId()
        );
        return findDtoById(candidateId);
    }

    public ProjectCandidateDto reject(long candidateId, CandidateStageRequest request) {
        requireWritePermission();
        CandidateRow candidate = loadCandidate(candidateId);
        if (!ProjectWorkflowData.ACTIVE_CANDIDATE_STAGES.contains(candidate.stage())
                && !"OFFERED".equals(candidate.stage())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "この候補は不採用にできません");
        }
        candidateRepository.markClosed(candidateId, "REJECTED", "CLIENT_REJECTED", timestampNow());
        return findDtoById(candidateId);
    }

    public ProjectCandidateDto withdraw(long candidateId, CandidateStageRequest request) {
        requireWritePermission();
        CandidateRow candidate = loadCandidate(candidateId);
        if (!ProjectWorkflowData.ACTIVE_CANDIDATE_STAGES.contains(candidate.stage())
                && !"OFFERED".equals(candidate.stage())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "この候補は撤回できません");
        }
        candidateRepository.markClosed(candidateId, "WITHDRAWN", "INTERNAL_WITHDRAW", timestampNow());
        return findDtoById(candidateId);
    }

    private CandidateRow loadCandidate(long candidateId) {
        return candidateRepository.findRowById(candidateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "候補が見つかりません"));
    }

    private ProjectCandidateDto findDtoById(long candidateId) {
        CandidateRow row = loadCandidate(candidateId);
        return candidateRepository.findByProjectId(row.projectId()).stream()
                .filter(candidate -> candidate.id() == candidateId)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "候補が見つかりません"));
    }

    private void validateStageTransition(String currentStage, String newStage) {
        if (!ProjectWorkflowData.ALL_CANDIDATE_STAGES.contains(newStage)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ステージが不正です: " + newStage
            );
        }
        Set<String> allowed = STAGE_TRANSITIONS.get(currentStage);
        if (allowed == null || !allowed.contains(newStage)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "このステージ変更はできません");
        }
    }

    private void ensureProjectExists(long projectId) {
        projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
    }

    private void ensureMatchableProject(long projectId) {
        var project = projectRepository.findHeaderById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
        if (!ProjectWorkflowData.MATCHABLE_PROJECT_STATUSES.contains(project.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "募集中・一部確定の案件のみマッチングできます");
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
