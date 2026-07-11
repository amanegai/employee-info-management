package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.BulkPayrollMailRequest;
import jp.dispatch.employee.dto.BulkPayrollMailResultDto;
import jp.dispatch.employee.dto.HrOpsClientMailStatusDto;
import jp.dispatch.employee.service.HrOpsPayrollMailService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hr-ops/payroll-mail")
public class HrOpsPayrollMailController {

    private final HrOpsPayrollMailService service;

    public HrOpsPayrollMailController(HrOpsPayrollMailService service) {
        this.service = service;
    }

    @GetMapping("/mail-status")
    public HrOpsClientMailStatusDto mailStatus() {
        return service.mailStatus();
    }

    @PostMapping("/bulk")
    public BulkPayrollMailResultDto sendBulk(@RequestBody BulkPayrollMailRequest request) {
        return service.sendBulk(request);
    }
}
