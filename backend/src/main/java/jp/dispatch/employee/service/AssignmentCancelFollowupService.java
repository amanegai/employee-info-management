package jp.dispatch.employee.service;

import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.AssignmentCancelFollowupCountDto;
import jp.dispatch.employee.dto.AssignmentCancelFollowupDto;
import jp.dispatch.employee.dto.AssignmentCancelFollowupResolveRequest;
import jp.dispatch.employee.dto.DispatchProjectDto;
import jp.dispatch.employee.repository.AssignmentCancelFollowupRepository;
import jp.dispatch.employee.repository.DispatchProjectRepository;
import jp.dispatch.employee.repository.EmployeeProjectAssignmentRepository.AssignmentRow;
import jp.dispatch.employee.repository.EmployeeRepository;
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

@Service
public class AssignmentCancelFollowupService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private final AssignmentCancelFollowupRepository followupRepository;
    private final DispatchProjectRepository projectRepository;
    private final EmployeeRepository employeeRepository;
    private final SecurityService securityService;

    @Value("${app.project.cancel-followup-days:3}")
    private int followupDays;

    public AssignmentCancelFollowupService(
            AssignmentCancelFollowupRepository followupRepository,
            DispatchProjectRepository projectRepository,
            EmployeeRepository employeeRepository,
            SecurityService securityService
    ) {
        this.followupRepository = followupRepository;
        this.projectRepository = projectRepository;
        this.employeeRepository = employeeRepository;
        this.securityService = securityService;
    }

    public List<AssignmentCancelFollowupDto> list(String status, Long employeeId) {
        requireWritePermission();
        ViewerContext viewer = viewerContext();
        return followupRepository.findVisible(status, employeeId, viewer.userId(), viewer.isAdmin());
    }

    public AssignmentCancelFollowupCountDto openCount() {
        requireWritePermission();
        ViewerContext viewer = viewerContext();
        return new AssignmentCancelFollowupCountDto(
                followupRepository.countOpenVisible(viewer.userId(), viewer.isAdmin())
        );
    }

    public List<AssignmentCancelFollowupDto> listByEmployee(long employeeId, String status) {
        requireWritePermission();
        if (employeeRepository.findById(employeeId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません");
        }
        ViewerContext viewer = viewerContext();
        return followupRepository.findVisible(status, employeeId, viewer.userId(), viewer.isAdmin());
    }

    @Transactional
    public void createOnAssignmentCancel(AssignmentRow assignment, String cancelReason, Long operatorUserId) {
        String now = timestampNow();
        LocalDate dueDate = LocalDate.now(ZONE).plusDays(followupDays);

        Long assignedTo = resolveAssignedTo(assignment.projectId(), operatorUserId);
        String notes = "他案件への再提案・マッチングが必要か確認してください。";

        followupRepository.insert(
                assignment.employeeId(),
                assignment.id(),
                assignment.projectId(),
                cancelReason,
                assignedTo,
                dueDate.toString(),
                notes,
                operatorUserId,
                now
        );
    }

    @Transactional
    public AssignmentCancelFollowupDto resolve(long id, AssignmentCancelFollowupResolveRequest request) {
        requireWritePermission();
        AssignmentCancelFollowupDto followup = findAccessible(id);
        if (!"OPEN".equals(followup.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "このフォローは既に処理済みです");
        }
        ensureCanActOn(followup);

        String now = timestampNow();
        AppUserDetails user = securityService.currentUser();
        Long userId = user != null ? user.getId() : null;
        followupRepository.resolve(id, "DONE", buildResolveNotes(request, followup.notes()), userId, now);
        return followupRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "フォローが見つかりません"));
    }

    @Transactional
    public AssignmentCancelFollowupDto dismiss(long id) {
        requireManageUsersPermission();
        AssignmentCancelFollowupDto followup = followupRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "フォローが見つかりません"));
        if (!"OPEN".equals(followup.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "このフォローは既に処理済みです");
        }

        String now = timestampNow();
        AppUserDetails user = securityService.currentUser();
        Long userId = user != null ? user.getId() : null;
        followupRepository.resolve(id, "DISMISSED", followup.notes(), userId, now);
        return followupRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "フォローが見つかりません"));
    }

    private AssignmentCancelFollowupDto findAccessible(long id) {
        AssignmentCancelFollowupDto followup = followupRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "フォローが見つかりません"));
        ViewerContext viewer = viewerContext();
        if (!viewer.isAdmin() && viewer.userId() != null) {
            boolean assigned = followup.assignedTo() != null && followup.assignedTo().equals(viewer.userId());
            boolean creator = followup.createdBy() != null && followup.createdBy().equals(viewer.userId());
            if (!assigned && !creator) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "このフォローを操作する権限がありません");
            }
        } else if (!viewer.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "このフォローを操作する権限がありません");
        }
        return followup;
    }

    private void ensureCanActOn(AssignmentCancelFollowupDto followup) {
        ViewerContext viewer = viewerContext();
        if (viewer.isAdmin()) {
            return;
        }
        if (viewer.userId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "このフォローを操作する権限がありません");
        }
        boolean assigned = followup.assignedTo() != null && followup.assignedTo().equals(viewer.userId());
        if (!assigned) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "担当者のみ完了できます");
        }
    }

    private Long resolveAssignedTo(long projectId, Long operatorUserId) {
        Long ownerUserId = projectRepository.findById(projectId)
                .map(DispatchProjectDto::ownerUserId)
                .orElse(null);
        return ownerUserId != null ? ownerUserId : operatorUserId;
    }

    private static String buildResolveNotes(AssignmentCancelFollowupResolveRequest request, String existingNotes) {
        if (request == null) {
            return existingNotes;
        }
        StringBuilder notes = new StringBuilder(existingNotes != null ? existingNotes.trim() : "");
        if (request.notes() != null && !request.notes().isBlank()) {
            if (notes.length() > 0) {
                notes.append("\n");
            }
            notes.append(request.notes().trim());
        }
        if (Boolean.TRUE.equals(request.reProposedInOtherProject())) {
            if (notes.length() > 0) {
                notes.append("\n");
            }
            notes.append("[完了] 他案件へ再提案済");
        }
        if (Boolean.TRUE.equals(request.reMatched())) {
            if (notes.length() > 0) {
                notes.append("\n");
            }
            notes.append("[完了] 再マッチング実施済");
        }
        return notes.length() > 0 ? notes.toString() : null;
    }

    private ViewerContext viewerContext() {
        AppUserDetails user = securityService.currentUser();
        if (user == null) {
            return new ViewerContext(null, false);
        }
        return new ViewerContext(user.getId(), securityService.canManageUsers());
    }

    private void requireWritePermission() {
        if (!securityService.canWriteProjectFeatures()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "編集権限がありません");
        }
    }

    private void requireManageUsersPermission() {
        if (!securityService.canManageUsers()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "管理者権限が必要です");
        }
    }

    private static String timestampNow() {
        return LocalDateTime.now(ZONE).format(TIMESTAMP);
    }

    private record ViewerContext(Long userId, boolean isAdmin) {
    }
}