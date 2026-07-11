package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.AuditLogDto;
import jp.dispatch.employee.service.AuditLogService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public List<AuditLogDto> list(
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(required = false) String action
    ) {
        return auditLogService.listRecent(limit, action);
    }
}
