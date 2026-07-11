package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.HrOpsClientActiveEmployeeDto;
import jp.dispatch.employee.dto.HrOpsClientMailSendRequest;
import jp.dispatch.employee.dto.HrOpsClientMailSendResult;
import jp.dispatch.employee.dto.HrOpsClientMailStatusDto;
import jp.dispatch.employee.service.HrOpsClientMailService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr-ops/client-send")
public class HrOpsClientMailController {

    private final HrOpsClientMailService service;

    public HrOpsClientMailController(HrOpsClientMailService service) {
        this.service = service;
    }

    @GetMapping("/clients/{clientId}/active-employees")
    public List<HrOpsClientActiveEmployeeDto> activeEmployees(@PathVariable long clientId) {
        return service.listActiveEmployees(clientId);
    }

    @GetMapping("/mail-status")
    public HrOpsClientMailStatusDto mailStatus() {
        return service.mailStatus();
    }

    @PostMapping
    public HrOpsClientMailSendResult send(@RequestBody HrOpsClientMailSendRequest request) {
        return service.send(request);
    }
}
