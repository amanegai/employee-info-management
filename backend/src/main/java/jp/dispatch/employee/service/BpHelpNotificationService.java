package jp.dispatch.employee.service;

import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.AppNotificationCountDto;
import jp.dispatch.employee.dto.AppNotificationDto;
import jp.dispatch.employee.dto.BpHelpRequestDto;
import jp.dispatch.employee.dto.DispatchProjectDto;
import jp.dispatch.employee.dto.OpenCountDto;
import jp.dispatch.employee.model.NotificationTypes;
import jp.dispatch.employee.repository.AppNotificationRepository;
import jp.dispatch.employee.repository.AuthUserRepository;
import jp.dispatch.employee.repository.DispatchProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

@Service
public class BpHelpNotificationService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");
    private static final Set<String> HELPABLE_STATUSES = Set.of("OPEN", "PARTIALLY_FILLED");

    private final DispatchProjectRepository projectRepository;
    private final AppNotificationRepository notificationRepository;
    private final AuthUserRepository authUserRepository;
    private final SecurityService securityService;

    public BpHelpNotificationService(
            DispatchProjectRepository projectRepository,
            AppNotificationRepository notificationRepository,
            AuthUserRepository authUserRepository,
            SecurityService securityService
    ) {
        this.projectRepository = projectRepository;
        this.notificationRepository = notificationRepository;
        this.authUserRepository = authUserRepository;
        this.securityService = securityService;
    }

    public List<DispatchProjectDto> listOpenHelpRequests() {
        requireViewProjectPermission();
        return projectRepository.findOpenBpHelpRequests();
    }

    public OpenCountDto openHelpCount() {
        requireViewProjectPermission();
        return new OpenCountDto(projectRepository.countOpenBpHelpRequests());
    }

    @Transactional
    public DispatchProjectDto requestHelp(long projectId, BpHelpRequestDto request) {
        requireWritePermission();
        DispatchProjectDto project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
        requireHelpControlPermission(project);
        if (!HELPABLE_STATUSES.contains(project.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "募集中の案件のみBP求援できます");
        }
        if (!project.headcountUnlimited() && project.headcountFilled() >= project.headcountRequired()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "満員の案件にはBP求援できません");
        }

        AppUserDetails user = securityService.currentUser();
        Long userId = user != null ? user.getId() : null;
        String now = timestampNow();
        String note = blankToNull(request != null ? request.note() : null);
        Integer slotsNeeded = normalizeSlots(request != null ? request.slotsNeeded() : null, project);

        boolean wasOpen = project.bpHelpRequested();
        projectRepository.setBpHelp(projectId, true, wasOpen ? project.bpHelpRequestedAt() : now, userId, note, slotsNeeded, now);

        // 再依頼時は旧通知を閉じて新規配信
        notificationRepository.resolveByProjectAndType(projectId, NotificationTypes.BP_HELP_REQUESTED, now);
        broadcastBpHelp(projectId, project, userId, user != null ? user.getDisplayName() : null, note, slotsNeeded, now);

        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
    }

    @Transactional
    public DispatchProjectDto cancelHelp(long projectId) {
        requireWritePermission();
        DispatchProjectDto project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
        requireHelpControlPermission(project);
        String now = timestampNow();
        projectRepository.setBpHelp(projectId, false, null, null, null, null, now);
        notificationRepository.resolveByProjectAndType(projectId, NotificationTypes.BP_HELP_REQUESTED, now);
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
    }

    /** 満員などにより求援を自動終了 */
    @Transactional
    public void autoCancelIfRequested(long projectId) {
        var header = projectRepository.findHeaderById(projectId).orElse(null);
        if (header == null || !header.bpHelpRequested()) {
            return;
        }
        boolean filled = !header.headcountUnlimited() && header.headcountFilled() >= header.headcountRequired();
        boolean closedStatus = !HELPABLE_STATUSES.contains(header.status());
        if (!filled && !closedStatus) {
            return;
        }
        String now = timestampNow();
        projectRepository.setBpHelp(projectId, false, null, null, null, null, now);
        notificationRepository.resolveByProjectAndType(projectId, NotificationTypes.BP_HELP_REQUESTED, now);
    }

    public List<AppNotificationDto> listMyNotifications(boolean unreadOnly, int limit) {
        requireViewProjectPermission();
        AppUserDetails user = requireCurrentUser();
        return notificationRepository.findForRecipient(user.getId(), unreadOnly, limit <= 0 ? 50 : limit);
    }

    public AppNotificationCountDto unreadCount() {
        requireViewProjectPermission();
        AppUserDetails user = requireCurrentUser();
        return new AppNotificationCountDto(notificationRepository.countUnread(user.getId()));
    }

    public void markRead(long notificationId) {
        requireViewProjectPermission();
        AppUserDetails user = requireCurrentUser();
        if (!notificationRepository.markRead(notificationId, user.getId(), timestampNow())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "通知が見つかりません");
        }
    }

    public int markAllRead() {
        requireViewProjectPermission();
        AppUserDetails user = requireCurrentUser();
        return notificationRepository.markAllRead(user.getId(), timestampNow());
    }

    public void markProjectHelpRead(long projectId) {
        requireViewProjectPermission();
        AppUserDetails user = requireCurrentUser();
        notificationRepository.markProjectRead(
                user.getId(),
                projectId,
                NotificationTypes.BP_HELP_REQUESTED,
                timestampNow()
        );
    }

    private void broadcastBpHelp(
            long projectId,
            DispatchProjectDto project,
            Long actorUserId,
            String actorName,
            String note,
            Integer slotsNeeded,
            String now
    ) {
        String title = "BP求援: " + project.projectName();
        StringBuilder body = new StringBuilder();
        body.append(project.clientName() != null ? project.clientName() : "（取引先未設定）");
        if (slotsNeeded != null && slotsNeeded > 0) {
            body.append(" / 不足 ").append(slotsNeeded).append("名");
        } else if (!project.headcountUnlimited()) {
            int remain = Math.max(0, project.headcountRequired() - project.headcountFilled());
            if (remain > 0) {
                body.append(" / 不足 ").append(remain).append("名");
            }
        }
        if (project.requiredSkills() != null && !project.requiredSkills().isBlank()) {
            String skills = project.requiredSkills().replace('\n', '、').trim();
            if (skills.length() > 80) {
                skills = skills.substring(0, 80) + "…";
            }
            body.append(" / スキル: ").append(skills);
        }
        if (note != null) {
            body.append(" / ").append(note);
        }
        if (actorName != null && !actorName.isBlank()) {
            body.append("（依頼: ").append(actorName).append("）");
        }

        String linkPath = "/projects/" + projectId;
        for (Long recipientId : authUserRepository.findProjectNotificationRecipientIds()) {
            if (actorUserId != null && actorUserId.equals(recipientId)) {
                continue;
            }
            notificationRepository.insert(
                    recipientId,
                    NotificationTypes.BP_HELP_REQUESTED,
                    title,
                    body.toString(),
                    linkPath,
                    projectId,
                    actorUserId,
                    now
            );
        }
    }

    private static Integer normalizeSlots(Integer slotsNeeded, DispatchProjectDto project) {
        if (slotsNeeded != null && slotsNeeded > 0) {
            return slotsNeeded;
        }
        if (project.headcountUnlimited()) {
            return null;
        }
        int remain = project.headcountRequired() - project.headcountFilled();
        return remain > 0 ? remain : null;
    }

    private void ensureProjectExists(long id) {
        projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
    }

    private AppUserDetails requireCurrentUser() {
        AppUserDetails user = securityService.currentUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ログインが必要です");
        }
        return user;
    }

    /** BP求援の開始・更新・終了は、案件作成者／自社担当／管理者のみ許可 */
    private void requireHelpControlPermission(DispatchProjectDto project) {
        AppUserDetails user = requireCurrentUser();
        if (user.getRoles().contains(jp.dispatch.employee.auth.AuthRoles.ADMIN)) {
            return;
        }
        Long userId = user.getId();
        if (userId.equals(project.createdBy()) || userId.equals(project.ownerUserId())) {
            return;
        }
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "BP求援の操作は案件の作成者・自社担当・管理者のみ可能です"
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

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
