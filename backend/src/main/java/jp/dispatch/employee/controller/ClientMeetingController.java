package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.ClientMeetingDto;
import jp.dispatch.employee.dto.ClientMeetingSaveRequest;
import jp.dispatch.employee.dto.ClientMeetingSummaryDto;
import jp.dispatch.employee.dto.EligibleParticipantDto;
import jp.dispatch.employee.service.ClientMeetingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/client-meetings")
public class ClientMeetingController {

    private final ClientMeetingService service;

    public ClientMeetingController(ClientMeetingService service) {
        this.service = service;
    }

    @GetMapping("/meta/task-statuses")
    public List<String> taskStatuses() {
        return service.getTaskStatuses();
    }

    @GetMapping("/meta/task-priorities")
    public List<String> taskPriorities() {
        return service.getTaskPriorities();
    }

    @GetMapping("/eligible-attendees")
    public List<EligibleParticipantDto> eligibleAttendees() {
        return service.getEligibleAttendees();
    }

    @GetMapping("/summaries")
    public List<ClientMeetingSummaryDto> summaries(@RequestParam(required = false) String clientName) {
        return service.getSummaries(clientName);
    }

    @GetMapping
    public List<ClientMeetingDto> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) Long attendeeEmployeeId,
            @RequestParam(required = false) String taskStatus,
            @RequestParam(required = false) Long taskAssigneeEmployeeId
    ) {
        return service.search(
                keyword,
                dateFrom,
                dateTo,
                attendeeEmployeeId,
                taskStatus,
                taskAssigneeEmployeeId
        );
    }

    @GetMapping("/{id}")
    public ClientMeetingDto get(@PathVariable long id) {
        return service.getById(id);
    }

    @PostMapping
    public ClientMeetingDto create(@RequestBody ClientMeetingSaveRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public ClientMeetingDto update(@PathVariable long id, @RequestBody ClientMeetingSaveRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
