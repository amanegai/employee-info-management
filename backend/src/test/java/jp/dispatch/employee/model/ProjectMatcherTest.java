package jp.dispatch.employee.model;

import jp.dispatch.employee.model.ProjectInfoParser.ParsedProjectInfo;
import jp.dispatch.employee.repository.ProjectMatchRepository.MatchCandidateRow;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProjectMatcherTest {

    @Test
    void excludesCandidateWhenRequiredSkillsAreMissing() {
        ParsedProjectInfo criteria = new ParsedProjectInfo(
                "テスト案件",
                List.of("Java", "Spring"),
                List.of(),
                null,
                null,
                null,
                List.of(),
                null,
                null,
                null,
                null,
                null,
                false,
                null,
                null,
                null,
                null,
                false
        );
        MatchCandidateRow candidate = sampleCandidate();

        var outcome = ProjectMatcher.score(criteria, candidate, List.of("Python"));

        assertFalse(outcome.eligible());
    }

    @Test
    void includesCandidateWhenAtLeastOneRequiredSkillMatches() {
        ParsedProjectInfo criteria = new ParsedProjectInfo(
                "テスト案件",
                List.of("Java", "Spring"),
                List.of(),
                null,
                null,
                null,
                List.of(),
                null,
                null,
                null,
                null,
                null,
                false,
                null,
                null,
                null,
                null,
                false
        );
        MatchCandidateRow candidate = sampleCandidate();

        var outcome = ProjectMatcher.score(criteria, candidate, List.of("Java"));

        assertTrue(outcome.eligible());
        assertTrue(outcome.matchedSkills().contains("Java"));
        assertTrue(outcome.missingSkills().contains("Spring"));
    }

    @Test
    void includesCandidateWhenAllRequiredSkillsMatch() {
        ParsedProjectInfo criteria = new ParsedProjectInfo(
                "テスト案件",
                List.of("Java", "Spring"),
                List.of(),
                null,
                null,
                null,
                List.of(),
                null,
                null,
                null,
                null,
                null,
                false,
                null,
                null,
                null,
                null,
                false
        );
        MatchCandidateRow candidate = sampleCandidate();

        var outcome = ProjectMatcher.score(criteria, candidate, List.of("Java", "Spring Boot"));

        assertTrue(outcome.eligible());
    }

    @Test
    void includesCandidateWhenNoRequiredSkillsDefined() {
        ParsedProjectInfo criteria = new ParsedProjectInfo(
                "テスト案件",
                List.of(),
                List.of(),
                null,
                null,
                null,
                List.of(),
                null,
                null,
                null,
                null,
                null,
                false,
                null,
                null,
                null,
                null,
                false
        );
        MatchCandidateRow candidate = sampleCandidate();

        var outcome = ProjectMatcher.score(criteria, candidate, List.of("Python"));

        assertTrue(outcome.eligible());
    }

    @Test
    void excludesCandidateWhenUnitPriceExceedsBudgetAfterRequiredSkillMatch() {
        ParsedProjectInfo criteria = new ParsedProjectInfo(
                "テスト案件",
                List.of("Java"),
                List.of(),
                null,
                600_000,
                null,
                List.of(),
                null,
                null,
                null,
                null,
                null,
                false,
                null,
                null,
                null,
                null,
                false
        );
        MatchCandidateRow candidate = new MatchCandidateRow(
                1L, "E001", "テスト太郎", null, "待機中", null, null,
                850_000, "", null, null, 3, null, null, null
        );

        var outcome = ProjectMatcher.score(criteria, candidate, List.of("Java"));

        assertFalse(outcome.eligible());
    }

    @Test
    void includesCandidateWhenUnitPriceWithinBudgetAndRequiredSkillMatches() {
        ParsedProjectInfo criteria = new ParsedProjectInfo(
                "テスト案件",
                List.of("Java"),
                List.of(),
                null,
                600_000,
                null,
                List.of(),
                null,
                null,
                null,
                null,
                null,
                false,
                null,
                null,
                null,
                null,
                false
        );
        MatchCandidateRow candidate = new MatchCandidateRow(
                1L, "E001", "テスト太郎", null, "待機中", null, null,
                550_000, "", null, null, 3, null, null, null
        );

        var outcome = ProjectMatcher.score(criteria, candidate, List.of("Java"));

        assertTrue(outcome.eligible());
    }

    @Test
    void includesCandidateWhenSkillBasedPriceSkipsUnitPriceFilter() {
        ParsedProjectInfo criteria = new ParsedProjectInfo(
                "テスト案件",
                List.of("Java"),
                List.of(),
                null,
                600_000,
                null,
                List.of(),
                null,
                null,
                null,
                null,
                "スキル見合い",
                true,
                null,
                null,
                null,
                null,
                false
        );
        MatchCandidateRow candidate = new MatchCandidateRow(
                1L, "E001", "テスト太郎", null, "待機中", null, null,
                850_000, "", null, null, 3, null, null, null
        );

        var outcome = ProjectMatcher.score(criteria, candidate, List.of("Java"));

        assertTrue(outcome.eligible());
    }

    private static MatchCandidateRow sampleCandidate() {
        return new MatchCandidateRow(
                1L,
                "E001",
                "テスト太郎",
                null,
                "待機中",
                null,
                null,
                0,
                "",
                null,
                null,
                3,
                null,
                null,
                null
        );
    }

    @Test
    void excludesCandidateWhenEmployeeRoleBelowProjectRole() {
        ParsedProjectInfo criteria = criteriaWithRole("SE");
        MatchCandidateRow candidate = candidateWithRole("PG");

        assertFalse(ProjectMatcher.score(criteria, candidate, List.of("Java")).eligible());
    }

    @Test
    void includesCandidateWhenEmployeeRoleMeetsProjectRole() {
        ParsedProjectInfo criteria = criteriaWithRole("SE");
        MatchCandidateRow candidate = candidateWithRole("PL");

        assertTrue(ProjectMatcher.score(criteria, candidate, List.of("Java")).eligible());
    }

    @Test
    void includesPgAndAboveForPgProjectRole() {
        ParsedProjectInfo criteria = criteriaWithRole("PG");
        assertTrue(ProjectMatcher.score(criteria, candidateWithRole("PG"), List.of()).eligible());
        assertTrue(ProjectMatcher.score(criteria, candidateWithRole("SE"), List.of()).eligible());
        assertFalse(ProjectMatcher.score(criteria, candidateWithRole(null), List.of()).eligible());
    }

    @Test
    void pmProjectRoleAcceptsOnlyPm() {
        ParsedProjectInfo criteria = criteriaWithRole("PM");
        assertTrue(ProjectMatcher.score(criteria, candidateWithRole("PM"), List.of()).eligible());
        assertFalse(ProjectMatcher.score(criteria, candidateWithRole("PL"), List.of()).eligible());
    }

    @Test
    void leaderRoleMatchesPlAndAbove() {
        ParsedProjectInfo criteria = criteriaWithRole("PL");
        assertTrue(ProjectMatcher.score(criteria, candidateWithRole("PL"), List.of()).eligible());
        assertTrue(ProjectMatcher.score(criteria, candidateWithRole("PM"), List.of()).eligible());
        assertFalse(ProjectMatcher.score(criteria, candidateWithRole("SE"), List.of()).eligible());
    }

    private static ParsedProjectInfo criteriaWithRole(String role) {
        return new ParsedProjectInfo(
                "テスト案件",
                List.of(),
                List.of(),
                null,
                null,
                null,
                List.of(),
                null,
                null,
                null,
                role,
                null,
                false,
                null,
                null,
                null,
                null,
                false
        );
    }

    private static MatchCandidateRow candidateWithRole(String role) {
        return new MatchCandidateRow(
                1L, "E001", "テスト太郎", null, "待機中", role, null,
                0, "", null, null, 3, null, null, null
        );
    }
}
