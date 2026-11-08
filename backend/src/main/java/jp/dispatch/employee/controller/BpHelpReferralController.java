package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.BpHelpReferralDto;
import jp.dispatch.employee.dto.BpHelpReferralHireRequest;
import jp.dispatch.employee.dto.BpHelpReferralReviewRequest;
import jp.dispatch.employee.dto.BpHelpReferralStageRequest;
import jp.dispatch.employee.service.BpHelpReferralService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class BpHelpReferralController {

    private final BpHelpReferralService service;

    public BpHelpReferralController(BpHelpReferralService service) {
        this.service = service;
    }

    @GetMapping("/projects/{id}/bp-help/referrals")
    public List<BpHelpReferralDto> list(@PathVariable long id) {
        return service.listByProject(id);
    }

    @PostMapping(value = "/projects/{id}/bp-help/referrals", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public BpHelpReferralDto submit(
            @PathVariable long id,
            @RequestParam("candidateName") String candidateName,
            @RequestParam(value = "bpCompanyName", required = false) String bpCompanyName,
            @RequestParam(value = "note", required = false) String note,
            @RequestParam("resume") MultipartFile resume
    ) {
        return service.submit(id, candidateName, bpCompanyName, note, resume);
    }

    @PostMapping("/bp-help/referrals/{id}/approve")
    public BpHelpReferralDto approve(@PathVariable long id) {
        return service.approve(id);
    }

    @PostMapping("/bp-help/referrals/{id}/reject")
    public BpHelpReferralDto reject(
            @PathVariable long id,
            @RequestBody(required = false) BpHelpReferralReviewRequest request
    ) {
        return service.reject(id, request != null ? request : new BpHelpReferralReviewRequest(null));
    }

    @PostMapping("/bp-help/referrals/{id}/submit")
    public BpHelpReferralDto submitToClient(@PathVariable long id) {
        return service.submitToClient(id);
    }

    @PostMapping("/bp-help/referrals/{id}/stage")
    public BpHelpReferralDto advanceStage(
            @PathVariable long id,
            @RequestBody BpHelpReferralStageRequest request
    ) {
        return service.advanceStage(id, request);
    }

    @PostMapping("/bp-help/referrals/{id}/hire")
    public BpHelpReferralDto hire(
            @PathVariable long id,
            @RequestBody BpHelpReferralHireRequest request
    ) {
        return service.hire(id, request);
    }

    @PostMapping("/bp-help/referrals/{id}/withdraw")
    public Map<String, Object> withdraw(@PathVariable long id) {
        service.withdraw(id);
        return Map.of("ok", true);
    }
}
