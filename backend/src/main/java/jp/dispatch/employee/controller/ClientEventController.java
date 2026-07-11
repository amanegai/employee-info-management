package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.ClientEventDto;
import jp.dispatch.employee.dto.ClientEventOverlapDto;
import jp.dispatch.employee.dto.ClientEventSaveRequest;
import jp.dispatch.employee.dto.EligibleParticipantDto;
import jp.dispatch.employee.service.ClientEventService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/client-events")
public class ClientEventController {

    private final ClientEventService service;

    public ClientEventController(ClientEventService service) {
        this.service = service;
    }

    @GetMapping("/meta/event-types")
    public List<String> eventTypes() {
        return service.getEventTypes();
    }

    @GetMapping("/meta/event-statuses")
    public List<String> eventStatuses() {
        return service.getEventStatuses();
    }

    @GetMapping("/eligible-participants")
    public List<EligibleParticipantDto> eligibleParticipants() {
        return service.getEligibleParticipants();
    }

    @GetMapping
    public List<ClientEventDto> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String eventStatus,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) Long participantEmployeeId
    ) {
        return service.search(keyword, eventType, eventStatus, dateFrom, dateTo, participantEmployeeId);
    }

    @GetMapping("/{id}")
    public ClientEventDto get(@PathVariable long id) {
        return service.getById(id);
    }

    @PostMapping("/check-overlaps")
    public List<ClientEventOverlapDto> checkOverlaps(
            @RequestBody ClientEventSaveRequest request,
            @RequestParam(required = false) Long excludeEventId
    ) {
        return service.checkOverlaps(request, excludeEventId);
    }

    @PostMapping
    public ClientEventDto create(@RequestBody ClientEventSaveRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public ClientEventDto update(@PathVariable long id, @RequestBody ClientEventSaveRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
