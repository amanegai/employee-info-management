package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.AssignmentCancelRequest;
import jp.dispatch.employee.dto.AssignmentUpdateRequest;
import jp.dispatch.employee.dto.EmployeeProjectAssignmentDto;
import jp.dispatch.employee.service.EmployeeProjectAssignmentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class EmployeeProjectAssignmentController {

    private final EmployeeProjectAssignmentService service;

    public EmployeeProjectAssignmentController(EmployeeProjectAssignmentService service) {
        this.service = service;
    }

    @GetMapping("/employees/{employeeId}/assignments")
    public List<EmployeeProjectAssignmentDto> listByEmployee(@PathVariable long employeeId) {
        return service.listByEmployee(employeeId);
    }

    @PatchMapping("/assignments/{id}")
    public EmployeeProjectAssignmentDto update(@PathVariable long id, @RequestBody AssignmentUpdateRequest request) {
        return service.update(id, request);
    }

    @PostMapping("/assignments/{id}/cancel")
    public EmployeeProjectAssignmentDto cancel(
            @PathVariable long id,
            @RequestBody(required = false) AssignmentCancelRequest request
    ) {
        return service.cancel(id, request);
    }
}
