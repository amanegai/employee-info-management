package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.HrOpsRequestActionRequest;
import jp.dispatch.employee.dto.HrOpsRequestCountDto;
import jp.dispatch.employee.dto.HrOpsRequestDto;
import jp.dispatch.employee.dto.HrOpsRequestSaveRequest;
import jp.dispatch.employee.service.HrOpsRequestService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr-ops")
public class HrOpsRequestController {

    private final HrOpsRequestService service;

    public HrOpsRequestController(HrOpsRequestService service) {
        this.service = service;
    }

    @GetMapping("/meta/request-types")
    public List<String> requestTypes() {
        return service.requestTypes();
    }

    @GetMapping("/meta/statuses")
    public List<String> statuses() {
        return service.statuses();
    }

    @GetMapping("/requests")
    public List<HrOpsRequestDto> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String requestType
    ) {
        return service.list(status, requestType);
    }

    @GetMapping("/requests/pending-count")
    public HrOpsRequestCountDto pendingCount() {
        return service.pendingCount();
    }

    @GetMapping("/requests/{id}")
    public HrOpsRequestDto get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping("/requests")
    public HrOpsRequestDto create(@RequestBody HrOpsRequestSaveRequest request) {
        return service.create(request);
    }

    @PutMapping("/requests/{id}")
    public HrOpsRequestDto update(@PathVariable long id, @RequestBody HrOpsRequestSaveRequest request) {
        return service.update(id, request);
    }

    @PostMapping("/requests/{id}/submit")
    public HrOpsRequestDto submit(@PathVariable long id) {
        return service.submit(id);
    }

    @PostMapping("/requests/{id}/start")
    public HrOpsRequestDto start(@PathVariable long id) {
        return service.start(id);
    }

    @PostMapping("/requests/{id}/complete")
    public HrOpsRequestDto complete(@PathVariable long id, @RequestBody(required = false) HrOpsRequestActionRequest request) {
        return service.complete(id, request);
    }

    @PostMapping("/requests/{id}/reject")
    public HrOpsRequestDto reject(@PathVariable long id, @RequestBody HrOpsRequestActionRequest request) {
        return service.reject(id, request);
    }

    @PostMapping("/requests/{id}/cancel")
    public HrOpsRequestDto cancel(@PathVariable long id) {
        return service.cancel(id);
    }
}
