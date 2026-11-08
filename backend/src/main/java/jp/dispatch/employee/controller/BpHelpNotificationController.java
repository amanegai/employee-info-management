package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.AppNotificationCountDto;
import jp.dispatch.employee.dto.AppNotificationDto;
import jp.dispatch.employee.dto.BpHelpRequestDto;
import jp.dispatch.employee.dto.DispatchProjectDto;
import jp.dispatch.employee.dto.OpenCountDto;
import jp.dispatch.employee.service.BpHelpNotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class BpHelpNotificationController {

    private final BpHelpNotificationService service;

    public BpHelpNotificationController(BpHelpNotificationService service) {
        this.service = service;
    }

    @GetMapping("/bp-help-requests")
    public List<DispatchProjectDto> listHelpRequests() {
        return service.listOpenHelpRequests();
    }

    @GetMapping("/bp-help-requests/count")
    public OpenCountDto helpRequestCount() {
        return service.openHelpCount();
    }

    @PostMapping("/projects/{id}/bp-help")
    public DispatchProjectDto requestHelp(@PathVariable long id, @RequestBody(required = false) BpHelpRequestDto request) {
        return service.requestHelp(id, request != null ? request : new BpHelpRequestDto(null, null));
    }

    @PostMapping("/projects/{id}/bp-help/cancel")
    public DispatchProjectDto cancelHelp(@PathVariable long id) {
        return service.cancelHelp(id);
    }

    @GetMapping("/notifications")
    public List<AppNotificationDto> listNotifications(
            @RequestParam(required = false, defaultValue = "false") boolean unreadOnly,
            @RequestParam(required = false, defaultValue = "50") int limit
    ) {
        return service.listMyNotifications(unreadOnly, limit);
    }

    @GetMapping("/notifications/unread-count")
    public AppNotificationCountDto unreadCount() {
        return service.unreadCount();
    }

    @PostMapping("/notifications/{id}/read")
    public Map<String, Object> markRead(@PathVariable long id) {
        service.markRead(id);
        return Map.of("ok", true);
    }

    @PostMapping("/notifications/read-all")
    public Map<String, Object> markAllRead() {
        int updated = service.markAllRead();
        return Map.of("ok", true, "updated", updated);
    }

    @PostMapping("/notifications/by-project/{projectId}/read")
    public Map<String, Object> markProjectRead(@PathVariable long projectId) {
        service.markProjectHelpRead(projectId);
        return Map.of("ok", true);
    }
}
