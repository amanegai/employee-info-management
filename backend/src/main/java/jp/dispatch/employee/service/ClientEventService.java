package jp.dispatch.employee.service;

import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.DataScopeService;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.ClientEventDto;
import jp.dispatch.employee.dto.ClientEventOverlapDto;
import jp.dispatch.employee.dto.ClientEventParticipantRequest;
import jp.dispatch.employee.dto.ClientEventSaveRequest;
import jp.dispatch.employee.dto.EligibleParticipantDto;
import jp.dispatch.employee.model.ClientEventData;
import jp.dispatch.employee.repository.ClientEventRepository;
import jp.dispatch.employee.repository.ClientRepository;
import jp.dispatch.employee.repository.ClientEventRepository.ParticipantConflictRow;
import jp.dispatch.employee.repository.ClientEventRepository.ParticipantRow;
import jp.dispatch.employee.util.EventTimeParser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class ClientEventService {

    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private final ClientEventRepository repository;
    private final ClientRepository clientRepository;
    private final SecurityService securityService;
    private final DataScopeService dataScopeService;

    public ClientEventService(
            ClientEventRepository repository,
            ClientRepository clientRepository,
            SecurityService securityService,
            DataScopeService dataScopeService
    ) {
        this.repository = repository;
        this.clientRepository = clientRepository;
        this.securityService = securityService;
        this.dataScopeService = dataScopeService;
    }

    public List<String> getEventTypes() {
        requireViewPermission();
        return ClientEventData.EVENT_TYPES;
    }

    public List<String> getEventStatuses() {
        requireViewPermission();
        return ClientEventData.EVENT_STATUSES;
    }

    public List<EligibleParticipantDto> getEligibleParticipants() {
        requireViewPermission();
        return repository.findEligibleParticipants(dataScopeService.visibleDepartmentIdsOrNull());
    }

    public List<ClientEventDto> search(
            String keyword,
            String eventType,
            String eventStatus,
            String dateFrom,
            String dateTo,
            Long participantEmployeeId
    ) {
        requireViewPermission();
        validateDate(dateFrom, "開始日");
        validateDate(dateTo, "終了日");
        validateEventType(eventType);
        validateEventStatus(eventStatus);
        return repository.search(
                keyword,
                eventType,
                eventStatus,
                dateFrom,
                dateTo,
                participantEmployeeId,
                dataScopeService.visibleDepartmentIdsOrNull()
        );
    }

    public ClientEventDto getById(long id) {
        requireViewPermission();
        ClientEventDto event = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "イベントが見つかりません"));
        ensureAccessible(id);
        return event;
    }

    public ClientEventDto create(ClientEventSaveRequest request) {
        requireWritePermission();
        validateSaveRequest(request);
        String now = timestampNow();
        AppUserDetails user = securityService.currentUser();
        Long createdBy = user != null ? user.getId() : null;
        ResolvedClient client = resolveClient(request.clientId(), request.clientName());
        long id = repository.insert(
                client.clientId(),
                client.clientName(),
                request.eventName().trim(),
                request.eventDate().trim(),
                blankToNull(request.eventTime()),
                blankToNull(request.location()),
                normalizeEventType(request.eventType()),
                normalizeEventStatus(request.eventStatus()),
                blankToNull(request.notes()),
                createdBy,
                now
        );
        repository.replaceParticipants(id, toParticipantRows(request.participants()));
        return getById(id);
    }

    public ClientEventDto update(long id, ClientEventSaveRequest request) {
        requireWritePermission();
        ensureAccessible(id);
        validateSaveRequest(request);
        ResolvedClient client = resolveClient(request.clientId(), request.clientName());
        boolean updated = repository.update(
                id,
                client.clientId(),
                client.clientName(),
                request.eventName().trim(),
                request.eventDate().trim(),
                blankToNull(request.eventTime()),
                blankToNull(request.location()),
                normalizeEventType(request.eventType()),
                normalizeEventStatus(request.eventStatus()),
                blankToNull(request.notes()),
                timestampNow()
        );
        if (!updated) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "イベントが見つかりません");
        }
        repository.clearReminderLogs(id);
        repository.replaceParticipants(id, toParticipantRows(request.participants()));
        return getById(id);
    }

    public void delete(long id) {
        requireWritePermission();
        ensureAccessible(id);
        if (!repository.delete(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "イベントが見つかりません");
        }
    }

    public List<ClientEventOverlapDto> checkOverlaps(ClientEventSaveRequest request, Long excludeEventId) {
        requireWritePermission();
        if (request == null || isBlank(request.eventDate())) {
            return List.of();
        }
        String status = normalizeEventStatus(request.eventStatus());
        if ("中止".equals(status) || "実施済".equals(status)) {
            return List.of();
        }

        List<Long> employeeIds = extractEmployeeIds(request.participants());
        if (employeeIds.isEmpty()) {
            return List.of();
        }

        List<ParticipantConflictRow> conflicts = repository.findParticipantConflictsOnDate(
                request.eventDate().trim(),
                employeeIds,
                excludeEventId
        );
        if (conflicts.isEmpty()) {
            return List.of();
        }

        String newEventTime = blankToNull(request.eventTime());
        List<ClientEventOverlapDto> overlaps = new ArrayList<>();
        for (ParticipantConflictRow conflict : conflicts) {
            if (!EventTimeParser.overlaps(newEventTime, conflict.eventTime())) {
                continue;
            }
            boolean sameDayOnly = EventTimeParser.parse(newEventTime).isEmpty()
                    || EventTimeParser.parse(conflict.eventTime()).isEmpty();
            overlaps.add(new ClientEventOverlapDto(
                    conflict.employeeId(),
                    conflict.employeeName(),
                    conflict.eventId(),
                    conflict.eventName(),
                    conflict.clientName(),
                    conflict.eventDate(),
                    conflict.eventTime(),
                    conflict.eventStatus(),
                    sameDayOnly
            ));
        }
        return overlaps;
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
        if (isBlank(clientName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "取引先名を入力してください");
        }
        return new ResolvedClient(null, clientName.trim());
    }

    private void ensureAccessible(long id) {
        if (!repository.isAccessible(id, dataScopeService.visibleDepartmentIdsOrNull())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "このイベントを閲覧する権限がありません");
        }
    }

    private void validateSaveRequest(ClientEventSaveRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "リクエストが不正です");
        }
        if (request.clientId() == null && isBlank(request.clientName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "取引先名を入力してください");
        }
        if (isBlank(request.eventName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "イベント名を入力してください");
        }
        if (isBlank(request.eventDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "開催日を入力してください");
        }
        validateDate(request.eventDate(), "開催日");
        validateEventType(request.eventType());
        validateEventStatus(request.eventStatus());
        validatePostponedStatus(request);
        List<Long> employeeIds = extractEmployeeIds(request.participants());
        if (!employeeIds.isEmpty() && !repository.employeesExist(employeeIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "参加者に存在しない社員が含まれています");
        }
    }

    private List<ParticipantRow> toParticipantRows(List<ClientEventParticipantRequest> participants) {
        if (participants == null || participants.isEmpty()) {
            return List.of();
        }
        List<ParticipantRow> rows = new ArrayList<>();
        Set<Long> seen = new LinkedHashSet<>();
        for (ClientEventParticipantRequest participant : participants) {
            if (participant == null || participant.employeeId() == null || participant.employeeId() <= 0) {
                continue;
            }
            if (!seen.add(participant.employeeId())) {
                continue;
            }
            rows.add(new ParticipantRow(participant.employeeId(), blankToNull(participant.note())));
        }
        return rows;
    }

    private List<Long> extractEmployeeIds(List<ClientEventParticipantRequest> participants) {
        return toParticipantRows(participants).stream().map(ParticipantRow::employeeId).toList();
    }

    private void validateDate(String value, String label) {
        if (isBlank(value)) {
            return;
        }
        try {
            LocalDate.parse(value.trim());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "の形式が不正です");
        }
    }

    private void validateEventType(String eventType) {
        if (isBlank(eventType)) {
            return;
        }
        if (!ClientEventData.EVENT_TYPES.contains(eventType.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "種別が不正です");
        }
    }

    private void validatePostponedStatus(ClientEventSaveRequest request) {
        if (!"延期".equals(normalizeEventStatus(request.eventStatus()))) {
            return;
        }
        boolean hasNotes = !isBlank(request.notes());
        boolean hasFutureOrTodayDate = !isBlank(request.eventDate())
                && !LocalDate.parse(request.eventDate().trim()).isBefore(LocalDate.now(ZONE));
        if (!hasNotes && !hasFutureOrTodayDate) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "延期の場合、本日以降の開催日または備考を入力してください"
            );
        }
    }

    private void validateEventStatus(String eventStatus) {
        if (isBlank(eventStatus)) {
            return;
        }
        if (!ClientEventData.EVENT_STATUSES.contains(eventStatus.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "状態が不正です");
        }
    }

    private String normalizeEventStatus(String eventStatus) {
        if (isBlank(eventStatus)) {
            return "予定";
        }
        return eventStatus.trim();
    }

    private String normalizeEventType(String eventType) {
        if (isBlank(eventType)) {
            return "その他";
        }
        return eventType.trim();
    }

    private void requireViewPermission() {
        if (!securityService.canViewClientEvents()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "イベント参加管理を閲覧する権限がありません");
        }
    }

    private void requireWritePermission() {
        if (!securityService.canWriteClientEvents()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "イベント参加管理を編集する権限がありません");
        }
    }

    private static String timestampNow() {
        return LocalDateTime.now().format(TIMESTAMP);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record ResolvedClient(Long clientId, String clientName) {
    }
}
