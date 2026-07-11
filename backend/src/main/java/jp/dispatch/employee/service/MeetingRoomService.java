package jp.dispatch.employee.service;

import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.MeetingRoomDto;
import jp.dispatch.employee.dto.MeetingRoomSaveRequest;
import jp.dispatch.employee.repository.MeetingRoomRepository;
import jp.dispatch.employee.repository.MeetingRoomReservationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

@Service
public class MeetingRoomService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final Set<Integer> ALLOWED_SLOT_MINUTES = Set.of(15, 30, 60);

    private final MeetingRoomRepository repository;
    private final MeetingRoomReservationRepository reservationRepository;
    private final SecurityService securityService;

    public MeetingRoomService(
            MeetingRoomRepository repository,
            MeetingRoomReservationRepository reservationRepository,
            SecurityService securityService
    ) {
        this.repository = repository;
        this.reservationRepository = reservationRepository;
        this.securityService = securityService;
    }

    public List<MeetingRoomDto> listActive() {
        requireViewPermission();
        return repository.findAllActive();
    }

    public List<MeetingRoomDto> listAll() {
        requireManagePermission();
        return repository.findAll();
    }

    public MeetingRoomDto get(long id) {
        requireViewPermission();
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "会議室が見つかりません"));
    }

    public MeetingRoomDto create(MeetingRoomSaveRequest request) {
        requireManagePermission();
        validateSaveRequest(request);
        String name = normalizeText(request.name(), "会議室名");
        String floor = normalizeFloor(request.floor());
        ensureUniqueNameOnFloor(name, floor, null);
        String timestamp = now();
        int sortOrder = request.sortOrder() != null ? request.sortOrder() : repository.findMaxSortOrder() + 1;
        long id = repository.insert(
                name,
                floor,
                request.capacity(),
                trimToNull(request.equipment()),
                resolveSlotMinutes(request.slotMinutes()),
                normalizeTime(request.businessStart(), "09:00"),
                normalizeTime(request.businessEnd(), "22:00"),
                request.active() == null || request.active(),
                sortOrder,
                timestamp
        );
        return get(id);
    }

    public void delete(long id) {
        requireManagePermission();
        if (repository.findById(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "会議室が見つかりません");
        }
        reservationRepository.deleteByRoomId(id);
        if (!repository.deleteById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "会議室が見つかりません");
        }
    }

    public MeetingRoomDto update(long id, MeetingRoomSaveRequest request) {
        requireManagePermission();
        if (repository.findById(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "会議室が見つかりません");
        }
        validateSaveRequest(request);
        String name = normalizeText(request.name(), "会議室名");
        String floor = normalizeFloor(request.floor());
        ensureUniqueNameOnFloor(name, floor, id);
        String timestamp = now();
        boolean updated = repository.update(
                id,
                name,
                floor,
                request.capacity(),
                trimToNull(request.equipment()),
                resolveSlotMinutes(request.slotMinutes()),
                normalizeTime(request.businessStart(), "09:00"),
                normalizeTime(request.businessEnd(), "22:00"),
                request.active() == null || request.active(),
                request.sortOrder() != null ? request.sortOrder() : 0,
                timestamp
        );
        if (!updated) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "会議室が見つかりません");
        }
        return get(id);
    }

    private void validateSaveRequest(MeetingRoomSaveRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "リクエストが空です");
        }
        int slot = resolveSlotMinutes(request.slotMinutes());
        if (!ALLOWED_SLOT_MINUTES.contains(slot)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "時間枠は 15・30・60 分から選択してください");
        }
        String start = normalizeTime(request.businessStart(), "09:00");
        String end = normalizeTime(request.businessEnd(), "22:00");
        if (!LocalTime.parse(start, TIME).isBefore(LocalTime.parse(end, TIME))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "営業終了時刻は開始時刻より後にしてください");
        }
    }

    static int resolveSlotMinutes(Integer slotMinutes) {
        return slotMinutes != null ? slotMinutes : 30;
    }

    static String normalizeTime(String value, String defaultValue) {
        String text = value != null && !value.isBlank() ? value.trim() : defaultValue;
        if (!text.matches("^\\d{2}:\\d{2}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "時刻の形式が不正です（HH:mm）");
        }
        return text;
    }

    private static String normalizeText(String value, String fieldLabel) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldLabel + "は必須です");
        }
        return value.trim();
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String normalizeFloor(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return null;
        }
        if (!trimmed.matches("^\\d+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "フロアは数字のみ入力できます");
        }
        return trimmed;
    }

    private static String now() {
        return LocalDateTime.now().format(TIMESTAMP);
    }

    private void requireViewPermission() {
        if (!securityService.canViewMeetingRooms()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "権限がありません");
        }
    }

    private void ensureUniqueNameOnFloor(String name, String floor, Long excludeId) {
        if (repository.existsByNormalizedNameAndFloor(name, floor, excludeId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "同じフロアに同じ名前の会議室が既に存在します");
        }
    }

    private void requireManagePermission() {
        if (!securityService.canManageMeetingRooms()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "権限がありません");
        }
    }
}
