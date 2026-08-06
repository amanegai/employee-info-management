package jp.dispatch.employee.service;

import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.AuthRoles;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.BpHelpReferralDto;
import jp.dispatch.employee.dto.BpHelpReferralHireRequest;
import jp.dispatch.employee.dto.BpHelpReferralReviewRequest;
import jp.dispatch.employee.dto.BpHelpReferralStageRequest;
import jp.dispatch.employee.dto.DispatchProjectDto;
import jp.dispatch.employee.dto.EmployeeDto;
import jp.dispatch.employee.dto.EmployeeSaveRequest;
import jp.dispatch.employee.dto.FileAttachmentDto;
import jp.dispatch.employee.model.BpHelpReferralStatuses;
import jp.dispatch.employee.model.NotificationTypes;
import jp.dispatch.employee.repository.AppNotificationRepository;
import jp.dispatch.employee.repository.BpHelpReferralRepository;
import jp.dispatch.employee.repository.DispatchProjectRepository;
import jp.dispatch.employee.repository.EmployeeProjectAssignmentRepository;
import jp.dispatch.employee.repository.FileAttachmentRepository;
import jp.dispatch.employee.repository.ProjectCandidateRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class BpHelpReferralService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");
    private static final long DEFAULT_BP_DEPARTMENT_ID = 9L; // 営業部
    private static final Map<String, Set<String>> STAGE_TRANSITIONS = Map.of(
            BpHelpReferralStatuses.SUBMITTED, Set.of(BpHelpReferralStatuses.INTERVIEW_SCHEDULED),
            BpHelpReferralStatuses.INTERVIEW_SCHEDULED, Set.of(
                    BpHelpReferralStatuses.INTERVIEWING,
                    BpHelpReferralStatuses.CLIENT_REJECTED,
                    BpHelpReferralStatuses.DECLINED
            ),
            BpHelpReferralStatuses.INTERVIEWING, Set.of(
                    BpHelpReferralStatuses.CLIENT_REJECTED,
                    BpHelpReferralStatuses.DECLINED
            )
    );
    private static final Set<String> HIREABLE = Set.of(
            BpHelpReferralStatuses.INTERVIEW_SCHEDULED,
            BpHelpReferralStatuses.INTERVIEWING
    );

    private final BpHelpReferralRepository referralRepository;
    private final DispatchProjectRepository projectRepository;
    private final AppNotificationRepository notificationRepository;
    private final FileAttachmentService fileAttachmentService;
    private final FileAttachmentRepository fileAttachmentRepository;
    private final EmployeeService employeeService;
    private final ProjectCandidateRepository candidateRepository;
    private final EmployeeProjectAssignmentRepository assignmentRepository;
    private final BpHelpNotificationService bpHelpNotificationService;
    private final SecurityService securityService;

    public BpHelpReferralService(
            BpHelpReferralRepository referralRepository,
            DispatchProjectRepository projectRepository,
            AppNotificationRepository notificationRepository,
            FileAttachmentService fileAttachmentService,
            FileAttachmentRepository fileAttachmentRepository,
            EmployeeService employeeService,
            ProjectCandidateRepository candidateRepository,
            EmployeeProjectAssignmentRepository assignmentRepository,
            BpHelpNotificationService bpHelpNotificationService,
            SecurityService securityService
    ) {
        this.referralRepository = referralRepository;
        this.projectRepository = projectRepository;
        this.notificationRepository = notificationRepository;
        this.fileAttachmentService = fileAttachmentService;
        this.fileAttachmentRepository = fileAttachmentRepository;
        this.employeeService = employeeService;
        this.candidateRepository = candidateRepository;
        this.assignmentRepository = assignmentRepository;
        this.bpHelpNotificationService = bpHelpNotificationService;
        this.securityService = securityService;
    }

    public List<BpHelpReferralDto> listByProject(long projectId) {
        requireViewProjectPermission();
        ensureProjectExists(projectId);
        return referralRepository.findByProjectId(projectId);
    }

    @Transactional
    public BpHelpReferralDto submit(
            long projectId,
            String candidateName,
            String bpCompanyName,
            String note,
            MultipartFile resumeFile
    ) {
        requireWritePermission();
        DispatchProjectDto project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
        if (!project.bpHelpRequested()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "BP求援が公開中の案件のみ臨時候補を登録できます");
        }
        String name = requireTrimmed(candidateName, "候補者名は必須です");
        if (resumeFile == null || resumeFile.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "履歴書ファイルは必須です");
        }

        AppUserDetails user = requireCurrentUser();
        String now = timestampNow();
        FileAttachmentDto uploaded = fileAttachmentService.upload(
                resumeFile,
                "BP求援臨時候補: " + name,
                FileCategoryData.RESUME,
                null,
                null
        );

        long id = referralRepository.insert(
                projectId,
                name,
                blankToNull(bpCompanyName),
                uploaded.id(),
                blankToNull(note),
                BpHelpReferralStatuses.PENDING,
                user.getId(),
                now
        );

        notifyReviewers(project, user, name, blankToNull(bpCompanyName), now);
        return referralRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "臨時候補の取得に失敗しました"));
    }

    @Transactional
    public BpHelpReferralDto approve(long referralId) {
        requireWritePermission();
        BpHelpReferralDto referral = requireReferral(referralId);
        DispatchProjectDto project = requireProject(referral.projectId());
        requireReviewPermission(project);
        String now = timestampNow();
        AppUserDetails user = requireCurrentUser();
        if (!referralRepository.updateStatus(
                referralId,
                BpHelpReferralStatuses.PENDING,
                BpHelpReferralStatuses.APPROVED,
                user.getId(),
                now,
                null,
                null,
                null,
                now
        )) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "担当確認待ちの臨時候補のみ承認できます");
        }
        notifySubmitter(
                referral,
                project,
                user,
                NotificationTypes.BP_HELP_REFERRAL_APPROVED,
                "臨時候補が承認されました: " + referral.candidateName(),
                "案件担当が社内承認しました。次は顧客提出の準備です。",
                now
        );
        return requireReferral(referralId);
    }

    @Transactional
    public BpHelpReferralDto reject(long referralId, BpHelpReferralReviewRequest request) {
        requireWritePermission();
        BpHelpReferralDto referral = requireReferral(referralId);
        DispatchProjectDto project = requireProject(referral.projectId());
        requireReviewPermission(project);
        String now = timestampNow();
        AppUserDetails user = requireCurrentUser();
        String reviewNote = blankToNull(request != null ? request.note() : null);
        if (!referralRepository.updateStatus(
                referralId,
                BpHelpReferralStatuses.PENDING,
                BpHelpReferralStatuses.REJECTED,
                user.getId(),
                now,
                reviewNote,
                null,
                null,
                now
        )) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "担当確認待ちの臨時候補のみ却下できます");
        }
        String body = reviewNote != null
                ? "却下理由: " + reviewNote
                : "案件担当が臨時候補を却下しました。";
        notifySubmitter(
                referral,
                project,
                user,
                NotificationTypes.BP_HELP_REFERRAL_REJECTED,
                "臨時候補が却下されました: " + referral.candidateName(),
                body,
                now
        );
        purgeResumeIfPresent(referral);
        return requireReferral(referralId);
    }

    @Transactional
    public BpHelpReferralDto submitToClient(long referralId) {
        requireWritePermission();
        BpHelpReferralDto referral = requireReferral(referralId);
        DispatchProjectDto project = requireProject(referral.projectId());
        requireReviewPermission(project);
        String now = timestampNow();
        AppUserDetails user = requireCurrentUser();
        if (!referralRepository.updateStatus(
                referralId,
                BpHelpReferralStatuses.APPROVED,
                BpHelpReferralStatuses.SUBMITTED,
                null,
                null,
                null,
                user.getId(),
                now,
                now
        )) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "社内承認済の臨時候補のみ顧客提出できます");
        }
        notifySubmitter(
                referral,
                project,
                user,
                NotificationTypes.BP_HELP_REFERRAL_TO_CLIENT,
                "臨時候補が顧客へ提出されました: " + referral.candidateName(),
                "案件担当が顧客へ提出しました。",
                now
        );
        return requireReferral(referralId);
    }

    @Transactional
    public BpHelpReferralDto withdraw(long referralId) {
        requireWritePermission();
        BpHelpReferralDto referral = requireReferral(referralId);
        AppUserDetails user = requireCurrentUser();
        if (!user.getRoles().contains(AuthRoles.ADMIN)
                && (referral.submittedBy() == null || referral.submittedBy() != user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "自分の臨時候補のみ取り下げできます");
        }
        String now = timestampNow();
        if (!referralRepository.updateStatus(
                referralId,
                BpHelpReferralStatuses.PENDING,
                BpHelpReferralStatuses.WITHDRAWN,
                null,
                null,
                null,
                null,
                null,
                now
        )) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "担当確認待ちの臨時候補のみ取り下げできます");
        }
        purgeResumeIfPresent(referral);
        return requireReferral(referralId);
    }

    @Transactional
    public BpHelpReferralDto advanceStage(long referralId, BpHelpReferralStageRequest request) {
        requireWritePermission();
        BpHelpReferralDto referral = requireReferral(referralId);
        DispatchProjectDto project = requireProject(referral.projectId());
        requireReviewPermission(project);
        if (request == null || request.stage() == null || request.stage().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "遷移先ステータスは必須です");
        }
        String toStatus = request.stage().trim();
        Set<String> allowed = STAGE_TRANSITIONS.getOrDefault(referral.status(), Set.of());
        if (!allowed.contains(toStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "このステータスへは遷移できません");
        }
        String now = timestampNow();
        String interviewAt = blankToNull(request.interviewAt());
        String closeReason = blankToNull(request.note());
        if ((BpHelpReferralStatuses.CLIENT_REJECTED.equals(toStatus) || BpHelpReferralStatuses.DECLINED.equals(toStatus))
                && closeReason == null) {
            closeReason = BpHelpReferralStatuses.CLIENT_REJECTED.equals(toStatus) ? "顧客不採用" : "候補辞退";
        }
        if (!referralRepository.advanceAfterClientSubmit(
                referralId,
                referral.status(),
                toStatus,
                interviewAt,
                closeReason,
                now
        )) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ステータス更新に失敗しました");
        }

        AppUserDetails user = requireCurrentUser();
        if (BpHelpReferralStatuses.INTERVIEW_SCHEDULED.equals(toStatus)
                || BpHelpReferralStatuses.INTERVIEWING.equals(toStatus)) {
            notifySubmitter(
                    referral,
                    project,
                    user,
                    NotificationTypes.BP_HELP_REFERRAL_INTERVIEW,
                    "臨時候補の面談が進みました: " + referral.candidateName(),
                    statusLabel(toStatus)
                            + (interviewAt != null ? " / 面談予定: " + interviewAt : ""),
                    now
            );
        } else {
            notifySubmitter(
                    referral,
                    project,
                    user,
                    NotificationTypes.BP_HELP_REFERRAL_CLOSED,
                    "臨時候補が終了しました: " + referral.candidateName(),
                    statusLabel(toStatus) + (closeReason != null ? " / " + closeReason : ""),
                    now
            );
            if (BpHelpReferralStatuses.CLIENT_REJECTED.equals(toStatus)
                    || BpHelpReferralStatuses.DECLINED.equals(toStatus)) {
                purgeResumeIfPresent(referral);
            }
        }
        return requireReferral(referralId);
    }

    @Transactional
    public BpHelpReferralDto hire(long referralId, BpHelpReferralHireRequest request) {
        requireWritePermission();
        BpHelpReferralDto referral = requireReferral(referralId);
        DispatchProjectDto project = requireProject(referral.projectId());
        requireReviewPermission(project);
        if (!HIREABLE.contains(referral.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "面談中の臨時候補のみ採用確定できます");
        }
        if (request == null || request.startDate() == null || request.startDate().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "配属開始日は必須です");
        }
        String startDate = request.startDate().trim();
        parseDateOrThrow(startDate, "配属開始日");
        String endDate = blankToNull(request.endDate());
        if (endDate != null) {
            parseDateOrThrow(endDate, "配属終了日");
        }
        if (!project.headcountUnlimited() && project.headcountFilled() >= project.headcountRequired()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "案件の募集人数が満員です");
        }

        AppUserDetails user = requireCurrentUser();
        String now = timestampNow();
        long departmentId = request.departmentId() != null && request.departmentId() > 0
                ? request.departmentId()
                : DEFAULT_BP_DEPARTMENT_ID;

        String memo = buildHireMemo(referral);
        EmployeeSaveRequest employeeRequest = new EmployeeSaveRequest(
                null,
                referral.candidateName(),
                departmentId,
                null,
                null,
                "BP",
                "稼働中",
                0,
                null,
                endDate,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                memo,
                null,
                null,
                null,
                null
        );
        EmployeeDto employee = employeeService.create(employeeRequest);
        if (assignmentRepository.hasOpenPrimaryAssignment(employee.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "この社員には既に稼働中の配属があります");
        }

        // 履歴書を新社員へ紐付け（社員詳細のファイル一覧で確認できるようにする）
        if (referral.resumeFileId() > 0) {
            fileAttachmentRepository.assignToEmployee(referral.resumeFileId(), employee.id());
        }

        String candidateNote = "BP求援臨時候補から採用"
                + (referral.bpCompanyName() != null ? " / " + referral.bpCompanyName() : "");
        long candidateId = candidateRepository.insert(
                project.id(),
                employee.id(),
                null,
                null,
                candidateNote,
                user.getId(),
                now
        );
        candidateRepository.markConfirmed(candidateId, now);

        String assignmentNotes = blankToNull(request.notes());
        if (assignmentNotes == null) {
            assignmentNotes = candidateNote;
        }
        assignmentRepository.insertPlanned(
                employee.id(),
                project.id(),
                candidateId,
                project.clientName(),
                project.projectName(),
                startDate,
                endDate,
                assignmentNotes,
                user.getId(),
                now,
                now
        );
        candidateRepository.markLostForEmployeeExcept(employee.id(), candidateId, now);
        projectRepository.incrementHeadcountFilled(project.id(), now);
        bpHelpNotificationService.autoCancelIfRequested(project.id());

        if (!referralRepository.markHired(
                referralId,
                referral.status(),
                employee.id(),
                user.getId(),
                now,
                blankToNull(request.notes())
        )) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "採用確定の更新に失敗しました");
        }

        notifySubmitter(
                referral,
                project,
                user,
                NotificationTypes.BP_HELP_REFERRAL_HIRED,
                "臨時候補が採用確定しました: " + referral.candidateName(),
                "社員番号 " + employee.employeeCode() + " で登録し、配属を作成しました。",
                now
        );
        return requireReferral(referralId);
    }

    private static String buildHireMemo(BpHelpReferralDto referral) {
        StringBuilder memo = new StringBuilder("BP求援の臨時候補から採用登録");
        if (referral.bpCompanyName() != null && !referral.bpCompanyName().isBlank()) {
            memo.append(" / BP会社: ").append(referral.bpCompanyName());
        }
        if (referral.note() != null && !referral.note().isBlank()) {
            memo.append(" / ").append(referral.note());
        }
        return memo.toString();
    }

    /** 不合格終了時に履歴書をソフト削除（個人情報保護・ディスク整理） */
    private void purgeResumeIfPresent(BpHelpReferralDto referral) {
        if (referral == null || referral.resumeFileId() <= 0) {
            return;
        }
        fileAttachmentService.softDeleteForSystem(referral.resumeFileId());
    }

    private static String statusLabel(String status) {
        return switch (status) {
            case BpHelpReferralStatuses.INTERVIEW_SCHEDULED -> "面談調整中";
            case BpHelpReferralStatuses.INTERVIEWING -> "面談結果待ち";
            case BpHelpReferralStatuses.CLIENT_REJECTED -> "顧客不採用";
            case BpHelpReferralStatuses.DECLINED -> "辞退";
            default -> status;
        };
    }

    private static void parseDateOrThrow(String value, String label) {
        try {
            LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "の形式が不正です（YYYY-MM-DD）");
        }
    }

    private void notifyReviewers(
            DispatchProjectDto project,
            AppUserDetails actor,
            String candidateName,
            String bpCompanyName,
            String now
    ) {
        Long ownerId = project.ownerUserId() != null ? project.ownerUserId() : project.createdBy();
        if (ownerId == null || ownerId.equals(actor.getId())) {
            return;
        }
        String title = "臨時候補が届きました: " + project.projectName();
        StringBuilder body = new StringBuilder(candidateName);
        if (bpCompanyName != null) {
            body.append(" / ").append(bpCompanyName);
        }
        body.append("（提出: ").append(actor.getDisplayName() != null ? actor.getDisplayName() : actor.getUsername()).append("）");
        notificationRepository.insert(
                ownerId,
                NotificationTypes.BP_HELP_REFERRAL_SUBMITTED,
                title,
                body.toString(),
                "/projects/" + project.id(),
                project.id(),
                actor.getId(),
                now
        );
    }

    private void notifySubmitter(
            BpHelpReferralDto referral,
            DispatchProjectDto project,
            AppUserDetails actor,
            String type,
            String title,
            String body,
            String now
    ) {
        if (referral.submittedBy() == null || referral.submittedBy().equals(actor.getId())) {
            return;
        }
        notificationRepository.insert(
                referral.submittedBy(),
                type,
                title,
                body,
                "/projects/" + project.id(),
                project.id(),
                actor.getId(),
                now
        );
    }

    private void requireReviewPermission(DispatchProjectDto project) {
        AppUserDetails user = requireCurrentUser();
        if (user.getRoles().contains(AuthRoles.ADMIN)) {
            return;
        }
        Long userId = user.getId();
        Long reviewerId = project.ownerUserId() != null ? project.ownerUserId() : project.createdBy();
        if (reviewerId != null && userId.equals(reviewerId)) {
            return;
        }
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "臨時候補の確認・顧客提出は案件の自社担当（未設定時は作成者）または管理者のみ可能です"
        );
    }

    private BpHelpReferralDto requireReferral(long id) {
        return referralRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "臨時候補が見つかりません"));
    }

    private DispatchProjectDto requireProject(long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
    }

    private void ensureProjectExists(long projectId) {
        requireProject(projectId);
    }

    private AppUserDetails requireCurrentUser() {
        AppUserDetails user = securityService.currentUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ログインが必要です");
        }
        return user;
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

    private static String requireTrimmed(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String timestampNow() {
        return LocalDateTime.now(ZONE).format(TIMESTAMP);
    }
}
