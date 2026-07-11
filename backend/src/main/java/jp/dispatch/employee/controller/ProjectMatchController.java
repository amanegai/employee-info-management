package jp.dispatch.employee.controller;

import jp.dispatch.employee.dto.ProjectMatchRequest;
import jp.dispatch.employee.dto.ProjectMatchResponseDto;
import jp.dispatch.employee.service.ProjectMatchingService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/project-match")
public class ProjectMatchController {

    private final ProjectMatchingService service;

    public ProjectMatchController(ProjectMatchingService service) {
        this.service = service;
    }

    @PostMapping
    public ProjectMatchResponseDto match(@RequestBody ProjectMatchRequest request) {
        return service.match(request);
    }
}
