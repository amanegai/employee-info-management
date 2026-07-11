package jp.dispatch.employee.service;

import jp.dispatch.employee.auth.DataScopeService;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.ProjectMatchParsedDto;
import jp.dispatch.employee.dto.ProjectMatchRequest;
import jp.dispatch.employee.dto.ProjectMatchResponseDto;
import jp.dispatch.employee.dto.ProjectMatchResultDto;
import jp.dispatch.employee.model.ProjectInfoParser;
import jp.dispatch.employee.model.ProjectInfoParser.ParsedProjectInfo;
import jp.dispatch.employee.model.ProjectMatcher;
import jp.dispatch.employee.model.ProjectMatcher.MatchOutcome;
import jp.dispatch.employee.model.ProjectWorkflowData;
import jp.dispatch.employee.repository.ProjectMatchRepository;
import jp.dispatch.employee.repository.ProjectMatchRepository.MatchCandidateRow;
import jp.dispatch.employee.repository.ProjectCandidateRepository;
import jp.dispatch.employee.repository.DispatchProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class ProjectMatchingService {

    private final ProjectMatchRepository repository;
    private final ProjectCandidateRepository candidateRepository;
    private final DispatchProjectRepository projectRepository;
    private final DataScopeService dataScopeService;
    private final SecurityService securityService;

    public ProjectMatchingService(
            ProjectMatchRepository repository,
            ProjectCandidateRepository candidateRepository,
            DispatchProjectRepository projectRepository,
            DataScopeService dataScopeService,
            SecurityService securityService
    ) {
        this.repository = repository;
        this.candidateRepository = candidateRepository;
        this.projectRepository = projectRepository;
        this.dataScopeService = dataScopeService;
        this.securityService = securityService;
    }

    public ProjectMatchResponseDto match(ProjectMatchRequest request) {
        requireViewProjectPermission();
        Long projectId = request.projectId();
        if (projectId != null && projectId > 0) {
            ensureMatchableProject(projectId);
        }
        ParsedProjectInfo parsed = ProjectInfoParser.parse(request.projectText());
        if (projectId != null && projectId > 0) {
            var projectOpt = projectRepository.findById(projectId);
            if (projectOpt.isPresent()) {
                var project = projectOpt.get();
                parsed = ProjectInfoParser.mergeProjectRecord(parsed, project);
            }
        }
        ProjectMatchParsedDto parsedDto = toParsedDto(parsed);

        List<MatchCandidateRow> candidates = repository.findCandidates(dataScopeService.visibleDepartmentIdsOrNull());
        if (candidates.isEmpty()) {
            return new ProjectMatchResponseDto(parsedDto, List.of());
        }

        List<Long> ids = candidates.stream().map(MatchCandidateRow::id).toList();
        Map<Long, List<String>> skillTokensByEmployee = repository.findSkillTokensByEmployeeIds(ids);
        Map<Long, Integer> activeCounts = candidateRepository.countActiveByEmployeeIds(ids);
        Map<Long, Boolean> addedMap = projectId != null && projectId > 0
                ? candidateRepository.findAddedToProject(projectId, ids)
                : Map.of();

        List<ProjectMatchResultDto> results = new ArrayList<>();
        for (MatchCandidateRow candidate : candidates) {
            List<String> tokens = new ArrayList<>(skillTokensByEmployee.getOrDefault(candidate.id(), List.of()));
            addIfPresent(tokens, candidate.specialtyDev());
            addIfPresent(tokens, candidate.specialtyBusiness());
            addIfPresent(tokens, candidate.selfPr());

            MatchOutcome outcome = ProjectMatcher.score(parsed, candidate, tokens);
            if (!outcome.eligible()) {
                continue;
            }
            results.add(new ProjectMatchResultDto(
                    candidate.id(),
                    candidate.employeeCode(),
                    candidate.name(),
                    candidate.departmentName(),
                    candidate.workStatus(),
                    candidate.endDate(),
                    candidate.unitPrice(),
                    candidate.evaluation(),
                    outcome.matchScore(),
                    outcome.matchedSkills(),
                    outcome.missingSkills(),
                    outcome.matchedOptionalSkills(),
                    activeCounts.getOrDefault(candidate.id(), 0),
                    Boolean.TRUE.equals(addedMap.get(candidate.id()))
            ));
        }

        results.sort(Comparator
                .comparingInt(ProjectMatchResultDto::matchScore).reversed()
                .thenComparing(ProjectMatchResultDto::employeeCode));
        return new ProjectMatchResponseDto(parsedDto, results);
    }

    private static ProjectMatchParsedDto toParsedDto(ParsedProjectInfo parsed) {
        return new ProjectMatchParsedDto(
                parsed.projectName(),
                parsed.requiredSkills(),
                parsed.optionalSkills(),
                parsed.minUnitPrice(),
                parsed.maxUnitPrice(),
                parsed.minItYears(),
                parsed.keywords(),
                parsed.workSummary(),
                parsed.workLocation(),
                parsed.headcountRequired(),
                parsed.headcountUnlimited(),
                parsed.projectRole(),
                parsed.billingPriceLabel(),
                parsed.skipUnitPriceFilter(),
                parsed.interviewRounds(),
                parsed.notes(),
                parsed.expectedStartDate(),
                parsed.periodNotes()
        );
    }

    private static void addIfPresent(List<String> tokens, String value) {
        if (value != null && !value.isBlank()) {
            tokens.add(value);
        }
    }

    private void ensureMatchableProject(long projectId) {
        var project = projectRepository.findHeaderById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "案件が見つかりません"));
        if (!ProjectWorkflowData.MATCHABLE_PROJECT_STATUSES.contains(project.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "募集中・一部確定の案件のみマッチングできます");
        }
    }

    private void requireViewProjectPermission() {
        if (!securityService.canViewProjectFeatures()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "案件機能の閲覧権限がありません");
        }
    }
}
