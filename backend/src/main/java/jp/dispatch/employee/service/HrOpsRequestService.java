package jp.dispatch.employee.service;

import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.HrOpsRequestActionRequest;
import jp.dispatch.employee.dto.HrOpsRequestCountDto;
import jp.dispatch.employee.dto.HrOpsRequestDto;
import jp.dispatch.employee.dto.HrOpsRequestSaveRequest;
import jp.dispatch.employee.repository.EmployeeRepository;
import jp.dispatch.employee.repository.HrOpsRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class HrOpsRequestService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private final HrOpsRequestRepository repository;
    private final EmployeeRepository employeeRepository;
    private final SecurityService securityService;

    public HrOpsRequestService(
            HrOpsRequestRepository repository,
            EmployeeRepository employeeRepository,
            SecurityService securityService
    ) {
        this.repository = repository;
        this.employeeRepository = employeeRepository;
        this.securityService = securityService;
    }

    public List<String> requestTypes() {
        requireViewPermission();
        return HrOpsWorkflowData.REQUEST_TYPES;
    }

    public List<String> statuses() {
        requireViewPermission();
        return HrOpsWorkflowData.STATUSES;
    }

    public List<HrOpsRequestDto> list(String status, String requestType) {
        requireViewPermission();
        ViewerContext viewer = viewerContext();
        return repository.findVisible(status, requestType, viewer.userId(), viewer.hrManager());
    }

    public HrOpsRequestCountDto pendingCount() {
        requireViewPermission();
        if (!securityService.canManageHrOps()) {
            return new HrOpsRequestCountDto(0L);
        }
        return new HrOpsRequestCountDto(repository.countPendingForHr());
    }

    public HrOpsRequestDto get(long id) {
        requireViewPermission();
        return findAccessible(id);
    }

    @Transactional
    public HrOpsRequestDto create(HrOpsRequestSaveRequest request) {
        requireViewPermission();
        validateSaveRequest(request);
        AppUserDetails user = requireUser();
        String now = timestampNow();
        long id = repository.insert(request, user.getId(), now);
        return get(id);
    }

    @Transactional
    public HrOpsRequestDto update(long id, HrOpsRequestSaveRequest request) {
        requireViewPermission();
        validateSaveRequest(request);
        HrOpsRequestDto existing = findAccessible(id);
        ensureDraftEditable(existing);
        repository.updateDraft(id, request, timestampNow());
        return get(id);
    }

    @Transactional
    public HrOpsRequestDto submit(long id) {
        requireViewPermission();
        HrOpsRequestDto existing = findAccessible(id);
        ensureDraftEditable(existing);
        if (!repository.submit(id, timestampNow())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "申請を提出できません");
        }
        return get(id);
    }

    @Transactional
    public HrOpsRequestDto start(long id) {
        requireManagePermission();
        HrOpsRequestDto existing = findAccessible(id);
        if (!"SUBMITTED".equals(existing.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "対応開始できる状態ではありません");
        }
        AppUserDetails user = requireUser();
        if (!repository.start(id, user.getId(), timestampNow())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "対応開始に失敗しました");
        }
        return get(id);
    }

    @Transactional
    public HrOpsRequestDto complete(long id, HrOpsRequestActionRequest request) {
        requireManagePermission();
        findAccessible(id);
        AppUserDetails user = requireUser();
        String notes = normalizeOptional(request == null ? null : request.hrNotes());
        if (!repository.complete(id, user.getId(), notes, timestampNow())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "完了処理に失敗しました");
        }
        return get(id);
    }

    @Transactional
    public HrOpsRequestDto reject(long id, HrOpsRequestActionRequest request) {
        requireManagePermission();
        findAccessible(id);
        String reason = normalizeRequired(request == null ? null : request.rejectReason(), "却下理由");
        AppUserDetails user = requireUser();
        String notes = normalizeOptional(request == null ? null : request.hrNotes());
        if (!repository.reject(id, user.getId(), reason, notes, timestampNow())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "却下処理に失敗しました");
        }
        return get(id);
    }

    @Transactional
    public HrOpsRequestDto cancel(long id) {
        requireViewPermission();
        HrOpsRequestDto existing = findAccessible(id);
        ViewerContext viewer = viewerContext();
        if (!viewer.hrManager() && existing.requesterId() != viewer.userId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この申請を取消する権限がありません");
        }
        if (!repository.cancel(id, timestampNow())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "取消できる状態ではありません");
        }
        return get(id);
    }

    private HrOpsRequestDto findAccessible(long id) {
        HrOpsRequestDto dto = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "申請が見つかりません"));
        ViewerContext viewer = viewerContext();
        if (!viewer.hrManager() && dto.requesterId() != viewer.userId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この申請を閲覧する権限がありません");
        }
        return dto;
    }

    private void ensureDraftEditable(HrOpsRequestDto existing) {
        if (!"DRAFT".equals(existing.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "下書き状態の申請のみ編集できます");
        }
        ViewerContext viewer = viewerContext();
        if (!viewer.hrManager() && existing.requesterId() != viewer.userId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この申請を編集する権限がありません");
        }
    }

    private void validateSaveRequest(HrOpsRequestSaveRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "入力内容が不正です");
        }
        if (request.requestType() == null || request.requestType().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "申請種別は必須です");
        }
        if (!HrOpsWorkflowData.REQUEST_TYPES.contains(request.requestType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "申請種別が不正です");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "タイトルは必須です");
        }
        if (request.employeeId() != null && employeeRepository.findById(request.employeeId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "対象社員が見つかりません");
        }
    }

    private void requireViewPermission() {
        if (!securityService.canViewHrOps()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "人事業務管理の閲覧権限がありません");
        }
    }

    private void requireManagePermission() {
        if (!securityService.canManageHrOps()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "人事業務の処理権限がありません");
        }
    }

    private AppUserDetails requireUser() {
        AppUserDetails user = securityService.currentUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ログインが必要です");
        }
        return user;
    }

    private ViewerContext viewerContext() {
        AppUserDetails user = requireUser();
        return new ViewerContext(user.getId(), securityService.canManageHrOps());
    }

    private String timestampNow() {
        return LocalDateTime.now(ZONE).format(TIMESTAMP);
    }

    private String normalizeOptional(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeRequired(String value, String label) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "は必須です");
        }
        return trimmed;
    }

    private record ViewerContext(long userId, boolean hrManager) {
    }
}
