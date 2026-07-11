package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.ClientIssueDto;
import jp.dispatch.employee.dto.ClientIssueSaveRequest;
import jp.dispatch.employee.dto.EligibleParticipantDto;
import jp.dispatch.employee.service.ClientIssueService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/client-issues")
public class ClientIssueController {

    private final ClientIssueService service;

    public ClientIssueController(ClientIssueService service) {
        this.service = service;
    }

    @GetMapping("/meta/statuses")
    public List<String> statuses() {
        return service.getStatuses();
    }

    @GetMapping("/meta/priorities")
    public List<String> priorities() {
        return service.getPriorities();
    }

    @GetMapping("/eligible-assignees")
    public List<EligibleParticipantDto> eligibleAssignees() {
        return service.getEligibleAssignees();
    }

    @GetMapping
    public List<ClientIssueDto> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) Long assigneeEmployeeId,
            @RequestParam(required = false) Long meetingId
    ) {
        return service.search(keyword, status, priority, dateFrom, dateTo, assigneeEmployeeId, meetingId);
    }

    @GetMapping("/{id}")
    public ClientIssueDto get(@PathVariable long id) {
        return service.getById(id);
    }

    @PostMapping
    public ClientIssueDto create(@RequestBody ClientIssueSaveRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public ClientIssueDto update(@PathVariable long id, @RequestBody ClientIssueSaveRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
