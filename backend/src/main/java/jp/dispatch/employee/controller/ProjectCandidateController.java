package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.CandidateConfirmRequest;
import jp.dispatch.employee.dto.CandidateStageRequest;
import jp.dispatch.employee.dto.ProjectCandidateDto;
import jp.dispatch.employee.service.ProjectCandidateService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ProjectCandidateController {

    private final ProjectCandidateService candidateService;

    public ProjectCandidateController(ProjectCandidateService candidateService) {
        this.candidateService = candidateService;
    }

    @GetMapping("/candidates/meta/stages")
    public List<String> stages() {
        return candidateService.getCandidateStages();
    }

    @GetMapping("/employees/{employeeId}/candidates")
    public List<ProjectCandidateDto> listByEmployee(@PathVariable long employeeId) {
        return candidateService.listByEmployee(employeeId);
    }

    @PatchMapping("/candidates/{id}/stage")
    public ProjectCandidateDto updateStage(@PathVariable long id, @RequestBody CandidateStageRequest request) {
        return candidateService.updateStage(id, request);
    }

    @PostMapping("/candidates/{id}/confirm")
    public ProjectCandidateDto confirm(@PathVariable long id, @RequestBody CandidateConfirmRequest request) {
        return candidateService.confirmHire(id, request);
    }

    @PostMapping("/candidates/{id}/reject")
    public ProjectCandidateDto reject(@PathVariable long id, @RequestBody(required = false) CandidateStageRequest request) {
        return candidateService.reject(id, request != null ? request : new CandidateStageRequest(null, null, null));
    }

    @PostMapping("/candidates/{id}/withdraw")
    public ProjectCandidateDto withdraw(@PathVariable long id, @RequestBody(required = false) CandidateStageRequest request) {
        return candidateService.withdraw(id, request != null ? request : new CandidateStageRequest(null, null, null));
    }
}
