package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.EmployeeStatusMaintenanceResultDto;
import jp.dispatch.employee.dto.EmployeeStatusSuggestionDto;
import jp.dispatch.employee.service.EmployeeStatusMaintenanceService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employee-status")
public class EmployeeStatusController {

    private final EmployeeStatusMaintenanceService service;

    public EmployeeStatusController(EmployeeStatusMaintenanceService service) {
        this.service = service;
    }

    @GetMapping("/suggestions")
    public List<EmployeeStatusSuggestionDto> listSuggestions(@RequestParam(required = false) String status) {
        return service.listSuggestions(status);
    }

    @PostMapping("/suggestions/{id}/apply")
    public EmployeeStatusSuggestionDto apply(@PathVariable long id) {
        return service.applySuggestion(id);
    }

    @PostMapping("/suggestions/{id}/dismiss")
    public EmployeeStatusSuggestionDto dismiss(@PathVariable long id) {
        return service.dismissSuggestion(id);
    }

    @PostMapping("/maintenance/run")
    public EmployeeStatusMaintenanceResultDto runMaintenance() {
        return service.runMaintenanceManual();
    }
}
