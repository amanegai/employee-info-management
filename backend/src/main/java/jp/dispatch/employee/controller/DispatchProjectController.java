package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.DispatchProjectDto;
import jp.dispatch.employee.dto.DispatchProjectSaveRequest;
import jp.dispatch.employee.dto.DispatchProjectStatusRequest;
import jp.dispatch.employee.dto.ProjectCandidateDto;
import jp.dispatch.employee.dto.ProjectCandidateSaveRequest;
import jp.dispatch.employee.service.DispatchProjectService;
import jp.dispatch.employee.service.ProjectCandidateService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class DispatchProjectController {

    private final DispatchProjectService projectService;
    private final ProjectCandidateService candidateService;

    public DispatchProjectController(
            DispatchProjectService projectService,
            ProjectCandidateService candidateService
    ) {
        this.projectService = projectService;
        this.candidateService = candidateService;
    }

    @GetMapping("/meta/statuses")
    public List<String> statuses() {
        return projectService.getProjectStatuses();
    }

    @GetMapping
    public List<DispatchProjectDto> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status
    ) {
        return projectService.search(keyword, status);
    }

    @GetMapping("/{id}")
    public DispatchProjectDto get(@PathVariable long id) {
        return projectService.getById(id);
    }

    @PostMapping
    public DispatchProjectDto create(@RequestBody DispatchProjectSaveRequest request) {
        return projectService.create(request);
    }

    @PutMapping("/{id}")
    public DispatchProjectDto update(@PathVariable long id, @RequestBody DispatchProjectSaveRequest request) {
        return projectService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public DispatchProjectDto updateStatus(@PathVariable long id, @RequestBody DispatchProjectStatusRequest request) {
        return projectService.updateStatus(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable long id) {
        projectService.delete(id);
    }

    @GetMapping("/{id}/candidates")
    public List<ProjectCandidateDto> listCandidates(@PathVariable long id) {
        return candidateService.listByProject(id);
    }

    @PostMapping("/{id}/candidates")
    public ProjectCandidateDto addCandidate(@PathVariable long id, @RequestBody ProjectCandidateSaveRequest request) {
        return candidateService.addToProject(id, request);
    }
}
