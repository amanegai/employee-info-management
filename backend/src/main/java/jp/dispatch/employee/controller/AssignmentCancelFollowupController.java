package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.AssignmentCancelFollowupCountDto;
import jp.dispatch.employee.dto.AssignmentCancelFollowupDto;
import jp.dispatch.employee.dto.AssignmentCancelFollowupResolveRequest;
import jp.dispatch.employee.service.AssignmentCancelFollowupService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class AssignmentCancelFollowupController {

    private final AssignmentCancelFollowupService service;

    public AssignmentCancelFollowupController(AssignmentCancelFollowupService service) {
        this.service = service;
    }

    @GetMapping("/assignment-cancel-followups")
    public List<AssignmentCancelFollowupDto> list(@RequestParam(required = false) String status) {
        return service.list(status, null);
    }

    @GetMapping("/assignment-cancel-followups/open-count")
    public AssignmentCancelFollowupCountDto openCount() {
        return service.openCount();
    }

    @GetMapping("/employees/{employeeId}/assignment-cancel-followups")
    public List<AssignmentCancelFollowupDto> listByEmployee(
            @PathVariable long employeeId,
            @RequestParam(required = false) String status
    ) {
        return service.listByEmployee(employeeId, status);
    }

    @PostMapping("/assignment-cancel-followups/{id}/resolve")
    public AssignmentCancelFollowupDto resolve(
            @PathVariable long id,
            @RequestBody(required = false) AssignmentCancelFollowupResolveRequest request
    ) {
        return service.resolve(id, request);
    }

    @PostMapping("/assignment-cancel-followups/{id}/dismiss")
    public AssignmentCancelFollowupDto dismiss(@PathVariable long id) {
        return service.dismiss(id);
    }
}
