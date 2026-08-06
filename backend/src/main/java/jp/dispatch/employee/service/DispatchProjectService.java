package jp.dispatch.employee.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.DispatchProjectDto;
import jp.dispatch.employee.dto.DispatchProjectSaveRequest;
import jp.dispatch.employee.dto.DispatchProjectStatusRequest;
import jp.dispatch.employee.dto.ProjectCandidateDto;
import jp.dispatch.employee.model.AssignmentRoleCodes;
import jp.dispatch.employee.model.ProjectWorkflowData;
import jp.dispatch.employee.repository.ClientRepository;
import jp.dispatch.employee.repository.DispatchProjectRepository;
import jp.dispatch.employee.repository.ProjectCandidateRepository;
import jp.dispatch.employee.repository.RelatedDataCleanupRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class DispatchProjectService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");
    /** 確定人数から自動算出するステータス（保留・終了などの手動設定は上書きしない） */
    private static final java.util.Set<String> AUTO_MANAGED_STATUSES =
            java.util.Set.of("OPEN", "PARTIALLY_FILLED", "FILLED");

    private final DispatchProjectRepository projectRepository;
    private final ProjectCandidateRepository candidateRepository;
    private final RelatedDataCleanupRepository relatedDataCleanupRepository;
    private final ClientRepository clientRepository;
    private final SecurityService securityService;
    private final BpHelpNotificationService bpHelpNotificationService;

    public DispatchProjectService(
            DispatchProjectRepository projectRepository,
            ProjectCandidateRepository candidateRepository,
            RelatedDataCleanupRepository relatedDataCleanupRepository,
            ClientRepository clientRepository,
            SecurityService securityService,
            BpHelpNotificationService bpHelpNotificationService
    ) {
        this.projectRepository = projectRepository;
        this.candidateRepository = candidateRepository;
        this.relatedDataCleanupRepository = relatedDataCleanupRepository;
        this.clientRepository = clientRepository;
        this.securityService = securityService;
        this.bpHelpNotificationService = bpHelpNotificationService;
    }

    public List<String> getProjectStatuses() {
        requireViewProjectPermission();
        return ProjectWorkflowData.PROJECT_STATUSES;
    }

    public List<DispatchProjectDto> search(String keyword, String status) {
        requireViewProjectPermission();
        validateStatus(status);
        return projectRepository.search(keyword, status);
    }

    public DispatchProjectDto getById(long id) {
        requireViewProjectPermission();
        DispatchProjectDto project = projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
        List<ProjectCandidateDto> candidates = candidateRepository.findByProjectId(id);
        return withCandidates(project, candidates);
    }

    public DispatchProjectDto create(DispatchProjectSaveRequest request) {
        requireWritePermission();
        validateSaveRequest(request);
        String now = timestampNow();
        AppUserDetails user = securityService.currentUser();
        Long ownerUserId = request.ownerUserId() != null ? request.ownerUserId() : (user != null ? user.getId() : null);
        ResolvedClient client = resolveClient(request.clientId(), request.clientName());
        ensureProjectNotDuplicate(client.clientName(), request.projectName().trim());
        long id = projectRepository.insert(
                client.clientId(),
                client.clientName(),
                request.projectName().trim(),
                blankToNull(request.projectText()),
                blankToNull(request.requiredSkills()),
                blankToNull(request.optionalSkills()),
                resolveBillingUnitPrice(request),
                resolveBillingPriceLabel(request),
                blankToNull(request.workLocation()),
                blankToNull(request.expectedStartDate()),
                blankToNull(request.expectedEndDate()),
                resolveHeadcountRequired(request),
                resolveHeadcountUnlimited(request),
                resolveProjectRole(request.projectRole()),
                blankToNull(request.interviewRounds()),
                ownerUserId,
                user != null ? user.getId() : null,
                blankToNull(request.notes()),
                blankToNull(request.periodNotes()),
                now
        );
        return getById(id);
    }

    public DispatchProjectDto update(long id, DispatchProjectSaveRequest request) {
        requireWritePermission();
        ensureProjectExists(id);
        validateSaveRequest(request);
        String now = timestampNow();
        ResolvedClient client = resolveClient(request.clientId(), request.clientName());
        projectRepository.update(
                id,
                client.clientId(),
                client.clientName(),
                request.projectName().trim(),
                blankToNull(request.projectText()),
                blankToNull(request.requiredSkills()),
                blankToNull(request.optionalSkills()),
                resolveBillingUnitPrice(request),
                resolveBillingPriceLabel(request),
                blankToNull(request.workLocation()),
                blankToNull(request.expectedStartDate()),
                blankToNull(request.expectedEndDate()),
                resolveHeadcountRequired(request),
                resolveHeadcountUnlimited(request),
                resolveProjectRole(request.projectRole()),
                blankToNull(request.interviewRounds()),
                request.ownerUserId(),
                blankToNull(request.notes()),
                blankToNull(request.periodNotes()),
                now
        );
        syncHeadcountStatus(id, now);
        return getById(id);
    }

    /** 募集人数の変更に合わせて自動管理ステータス（募集中／一部確定／満員）を再計算する */
    private void syncHeadcountStatus(long id, String now) {
        var header = projectRepository.findHeaderById(id).orElse(null);
        if (header == null || !AUTO_MANAGED_STATUSES.contains(header.status())) {
            return;
        }
        int filled = header.headcountFilled();
        String next;
        if (header.headcountUnlimited()) {
            next = filled > 0 ? "PARTIALLY_FILLED" : "OPEN";
        } else if (filled >= header.headcountRequired()) {
            next = "FILLED";
        } else if (filled > 0) {
            next = "PARTIALLY_FILLED";
        } else {
            next = "OPEN";
        }
        if (next.equals(header.status())) {
            return;
        }
        projectRepository.updateStatus(id, next, null, now);
        bpHelpNotificationService.autoCancelIfRequested(id);
    }

    public DispatchProjectDto updateStatus(long id, DispatchProjectStatusRequest request) {
        requireWritePermission();
        ensureProjectExists(id);
        if (request.status() == null || request.status().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ステータスは必須です");
        }
        String status = request.status().trim();
        if (!ProjectWorkflowData.PROJECT_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ステータスが不正です");
        }
        projectRepository.updateStatus(id, status, blankToNull(request.notes()), timestampNow());
        bpHelpNotificationService.autoCancelIfRequested(id);
        return getById(id);
    }

    public void delete(long id) {
        requireWritePermission();
        ensureProjectExists(id);
        relatedDataCleanupRepository.deleteProjectRelations(id);
        if (!projectRepository.deleteById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません");
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
        if (clientName == null || clientName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "取引先名は必須です");
        }
        return new ResolvedClient(null, clientName.trim());
    }

    private void validateSaveRequest(DispatchProjectSaveRequest request) {
        if (request.clientId() == null && (request.clientName() == null || request.clientName().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "取引先名は必須です");
        }
        if (request.projectName() == null || request.projectName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "案件名は必須です");
        }
        validateDate(request.expectedStartDate(), "開始予定日");
        validateDate(request.expectedEndDate(), "終了予定日");
    }

    private void validateStatus(String status) {
        if (status == null || status.isBlank()) {
            return;
        }
        if (!ProjectWorkflowData.PROJECT_STATUSES.contains(status.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ステータスが不正です");
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

    private void ensureProjectExists(long id) {
        projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
    }

    private void ensureProjectNotDuplicate(String clientName, String projectName) {
        projectRepository.findIdByExactProjectName(projectName).ifPresent(existingId -> {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "同名の案件が既に存在します（案件ID: " + existingId + "）"
            );
        });
    }

    private static int resolveHeadcountRequired(DispatchProjectSaveRequest request) {
        if (Boolean.TRUE.equals(request.headcountUnlimited())) {
            return 0;
        }
        return normalizeHeadcount(request.headcountRequired());
    }

    private static boolean resolveHeadcountUnlimited(DispatchProjectSaveRequest request) {
        return Boolean.TRUE.equals(request.headcountUnlimited());
    }

    private static int normalizeHeadcount(Integer headcountRequired) {
        if (headcountRequired == null || headcountRequired < 1) {
            return 1;
        }
        return headcountRequired;
    }

    private static Integer normalizeBillingUnitPrice(Integer billingUnitPrice) {
        if (billingUnitPrice == null || billingUnitPrice <= 0) {
            return null;
        }
        return billingUnitPrice;
    }

    private static Integer resolveBillingUnitPrice(DispatchProjectSaveRequest request) {
        if (isSkillBasedPriceLabel(request.billingPriceLabel())) {
            return null;
        }
        return normalizeBillingUnitPrice(request.billingUnitPrice());
    }

    private static String resolveBillingPriceLabel(DispatchProjectSaveRequest request) {
        if (isSkillBasedPriceLabel(request.billingPriceLabel())) {
            return "スキル見合い";
        }
        return blankToNull(request.billingPriceLabel());
    }

    private static String resolveProjectRole(String projectRole) {
        return AssignmentRoleCodes.normalize(projectRole);
    }

    private static boolean isSkillBasedPriceLabel(String label) {
        if (label == null || label.isBlank()) {
            return false;
        }
        return label.replaceAll("[\\s　]+", "").contains("スキル見合");
    }

    private static DispatchProjectDto withCandidates(DispatchProjectDto project, List<ProjectCandidateDto> candidates) {
        return new DispatchProjectDto(
                project.id(),
                project.clientId(),
                project.clientName(),
                project.projectName(),
                project.projectText(),
                project.requiredSkills(),
                project.optionalSkills(),
                project.billingUnitPrice(),
                project.billingPriceLabel(),
                project.workLocation(),
                project.expectedStartDate(),
                project.expectedEndDate(),
                project.headcountRequired(),
                project.headcountFilled(),
                project.headcountUnlimited(),
                project.projectRole(),
                project.interviewRounds(),
                project.status(),
                project.ownerUserId(),
                project.ownerDisplayName(),
                project.notes(),
                project.periodNotes(),
                project.bpHelpRequested(),
                project.bpHelpRequestedAt(),
                project.bpHelpRequestedBy(),
                project.bpHelpRequesterName(),
                project.bpHelpNote(),
                project.bpHelpSlotsNeeded(),
                project.createdBy(),
                project.createdByName(),
                project.pendingReferralCount(),
                project.createdAt(),
                project.updatedAt(),
                candidates
        );
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

    private record ResolvedClient(Long clientId, String clientName) {
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    static String skillsToJson(List<String> skills, ObjectMapper objectMapper) {
        if (skills == null || skills.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(skills);
        } catch (JsonProcessingException ex) {
            return String.join(",", skills);
        }
    }
}
