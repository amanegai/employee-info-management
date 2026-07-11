package jp.dispatch.employee.service;

import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.MeetingRoomDto;
import jp.dispatch.employee.dto.MeetingRoomReservationDto;
import jp.dispatch.employee.dto.MeetingRoomReservationSaveRequest;
import jp.dispatch.employee.repository.MeetingRoomRepository;
import jp.dispatch.employee.repository.MeetingRoomReservationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class MeetingRoomReservationService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final MeetingRoomReservationRepository reservationRepository;
    private final MeetingRoomRepository roomRepository;
    private final SecurityService securityService;

    public MeetingRoomReservationService(
            MeetingRoomReservationRepository reservationRepository,
            MeetingRoomRepository roomRepository,
            SecurityService securityService
    ) {
        this.reservationRepository = reservationRepository;
        this.roomRepository = roomRepository;
        this.securityService = securityService;
    }

    public List<MeetingRoomReservationDto> search(String dateFrom, String dateTo, Long roomId) {
        requireViewPermission();
        LocalDate from = parseDate(dateFrom, "開始日");
        LocalDate to = parseDate(dateTo, "終了日");
        if (to.isBefore(from)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "終了日は開始日以降にしてください");
        }
        String rangeStart = from.atStartOfDay().format(TIMESTAMP);
        String rangeEnd = to.plusDays(1).atStartOfDay().format(TIMESTAMP);
        return reservationRepository.findBetween(rangeStart, rangeEnd, roomId, currentUserIdOrNull());
    }

    public MeetingRoomReservationDto get(long id) {
        requireViewPermission();
        return reservationRepository.findById(id, currentUserIdOrNull())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "予約が見つかりません"));
    }

    public MeetingRoomReservationDto create(MeetingRoomReservationSaveRequest request) {
        requireWritePermission();
        AppUserDetails user = requireCurrentUser();
        MeetingRoomDto room = resolveRoom(request.roomId());
        ValidatedReservation validated = validateReservation(request, room, null);
        ensureNoConflict(room.id(), validated.startAt(), validated.endAt(), null);
        String timestamp = now();
        long id = reservationRepository.insert(
                room.id(),
                validated.title(),
                validated.startAt(),
                validated.endAt(),
                user.getId(),
                validated.description(),
                timestamp
        );
        return get(id);
    }

    public MeetingRoomReservationDto update(long id, MeetingRoomReservationSaveRequest request) {
        requireWritePermission();
        MeetingRoomReservationDto existing = get(id);
        if (!"CONFIRMED".equals(existing.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "キャンセル済みの予約は変更できません");
        }
        requireModifyPermission(existing);
        MeetingRoomDto room = resolveRoom(request.roomId() != null ? request.roomId() : existing.roomId());
        if (room.id() != existing.roomId()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "会議室の変更はできません");
        }
        ValidatedReservation validated = validateReservation(request, room, id);
        ensureNoConflict(room.id(), validated.startAt(), validated.endAt(), id);
        boolean updated = reservationRepository.update(
                id,
                validated.title(),
                validated.startAt(),
                validated.endAt(),
                validated.description(),
                now()
        );
        if (!updated) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "予約が見つかりません");
        }
        return get(id);
    }

    public void cancel(long id) {
        requireWritePermission();
        MeetingRoomReservationDto existing = get(id);
        requireModifyPermission(existing);
        if (!reservationRepository.cancel(id, now())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "予約が見つかりません");
        }
    }

    private MeetingRoomDto resolveRoom(Long roomId) {
        if (roomId == null || roomId <= 0) {
            var activeRooms = roomRepository.findAllActive();
            if (activeRooms.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "利用可能な会議室がありません");
            }
            return activeRooms.getFirst();
        }
        MeetingRoomDto room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "会議室が見つかりません"));
        if (!room.active()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "無効な会議室です");
        }
        return room;
    }

    private ValidatedReservation validateReservation(
            MeetingRoomReservationSaveRequest request,
            MeetingRoomDto room,
            Long excludeId
    ) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "リクエストが空です");
        }
        String title = request.title() != null ? request.title().trim() : "";
        if (title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "件名は必須です");
        }
        LocalDateTime start = parseDateTime(request.startAt(), "開始日時");
        LocalDateTime end = parseDateTime(request.endAt(), "終了日時");
        if (!end.isAfter(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "終了日時は開始日時より後にしてください");
        }
        int slotMinutes = room.slotMinutes();
        validateSlotAlignment(start, slotMinutes, "開始日時");
        validateSlotAlignment(end, slotMinutes, "終了日時");
        long durationMinutes = java.time.Duration.between(start, end).toMinutes();
        if (durationMinutes % slotMinutes != 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "予約時間は " + slotMinutes + " 分単位で指定してください"
            );
        }
        LocalTime businessStart = LocalTime.parse(room.businessStart(), TIME);
        LocalTime businessEnd = LocalTime.parse(room.businessEnd(), TIME);
        if (start.toLocalTime().isBefore(businessStart) || end.toLocalTime().isAfter(businessEnd)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "予約可能時間は " + room.businessStart() + " 〜 " + room.businessEnd() + " です"
            );
        }
        if (!start.toLocalDate().equals(end.toLocalDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "予約は同一日の範囲で指定してください");
        }
        String description = request.description() != null && !request.description().isBlank()
                ? request.description().trim()
                : null;
        return new ValidatedReservation(title, start.format(TIMESTAMP), end.format(TIMESTAMP), description);
    }

    private void ensureNoConflict(long roomId, String startAt, String endAt, Long excludeId) {
        int conflicts = reservationRepository.countConflicts(roomId, startAt, endAt, excludeId);
        if (conflicts > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "指定の時間帯はすでに予約されています");
        }
    }

    private static void validateSlotAlignment(LocalDateTime dateTime, int slotMinutes, String label) {
        int minute = dateTime.getMinute();
        if (minute % slotMinutes != 0 || dateTime.getSecond() != 0 || dateTime.getNano() != 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    label + "は " + slotMinutes + " 分単位（例: 09:00, 09:30）で指定してください"
            );
        }
    }

    private static LocalDate parseDate(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "は必須です");
        }
        try {
            return LocalDate.parse(value.trim(), DATE);
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "の形式が不正です");
        }
    }

    private static LocalDateTime parseDateTime(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "は必須です");
        }
        String text = value.trim();
        try {
            if (text.length() == 16) {
                return LocalDateTime.parse(text + ":00", TIMESTAMP);
            }
            return LocalDateTime.parse(text, TIMESTAMP);
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "の形式が不正です");
        }
    }

    private void requireModifyPermission(MeetingRoomReservationDto reservation) {
        if (securityService.canManageMeetingRooms()) {
            return;
        }
        AppUserDetails user = requireCurrentUser();
        if (reservation.reservedBy() != user.getId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "他のユーザーの予約は変更できません");
        }
    }

    private AppUserDetails requireCurrentUser() {
        AppUserDetails user = securityService.currentUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ログインが必要です");
        }
        return user;
    }

    private Long currentUserIdOrNull() {
        AppUserDetails user = securityService.currentUser();
        return user != null ? user.getId() : null;
    }

    private static String now() {
        return LocalDateTime.now().format(TIMESTAMP);
    }

    private void requireViewPermission() {
        if (!securityService.canViewMeetingRooms()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "権限がありません");
        }
    }

    private void requireWritePermission() {
        if (!securityService.canWriteMeetingRoomReservations()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "権限がありません");
        }
    }

    private record ValidatedReservation(String title, String startAt, String endAt, String description) {
    }
}
