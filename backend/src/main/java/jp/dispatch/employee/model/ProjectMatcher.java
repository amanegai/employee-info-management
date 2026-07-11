package jp.dispatch.employee.model;

import jp.dispatch.employee.model.ProjectInfoParser.ParsedProjectInfo;
import jp.dispatch.employee.repository.ProjectMatchRepository.MatchCandidateRow;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class ProjectMatcher {

    private ProjectMatcher() {
    }

    public static MatchOutcome score(
            ParsedProjectInfo criteria,
            MatchCandidateRow candidate,
            List<String> skillTokens
    ) {
        List<String> required = normalizeSkills(criteria.requiredSkills());
        if (!passesRoleFilter(criteria, candidate)) {
            return MatchOutcome.rejected();
        }
        if (!passesExperienceFilter(criteria, candidate)) {
            return MatchOutcome.rejected();
        }

        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        for (String skill : required) {
            if (containsSkill(skillTokens, skill)) {
                matched.add(skill);
            } else {
                missing.add(skill);
            }
        }

        List<String> optionalMatched = new ArrayList<>();
        for (String skill : normalizeSkills(criteria.optionalSkills())) {
            if (containsSkill(skillTokens, skill)) {
                optionalMatched.add(skill);
            }
        }

        if (!required.isEmpty() && matched.isEmpty()) {
            return MatchOutcome.rejected();
        }

        if (!passesUnitPriceFilter(criteria, candidate, required, matched)) {
            return MatchOutcome.rejected();
        }

        int score = computeScore(criteria, candidate, required, matched, optionalMatched, skillTokens);
        return new MatchOutcome(true, score, matched, missing, optionalMatched);
    }

    /** 必須スキルが定義されている場合、1 件以上一致した社員のみ請求単価条件を適用する */
    private static boolean passesUnitPriceFilter(
            ParsedProjectInfo criteria,
            MatchCandidateRow candidate,
            List<String> required,
            List<String> matched
    ) {
        if (criteria.skipUnitPriceFilter()) {
            return true;
        }
        if (!required.isEmpty() && matched.isEmpty()) {
            return true;
        }
        return passesUnitPriceLimit(criteria, candidate.unitPrice());
    }

    private static boolean passesUnitPriceLimit(ParsedProjectInfo criteria, int employeePrice) {
        if (employeePrice > 0 && !fitsProjectBudget(criteria, employeePrice)) {
            return false;
        }
        return true;
    }

    private static boolean passesRoleFilter(ParsedProjectInfo criteria, MatchCandidateRow candidate) {
        return AssignmentRoleCodes.isEmployeeEligibleForProjectRole(
                criteria.projectRole(),
                candidate.assignmentRole()
        );
    }

    private static boolean passesExperienceFilter(ParsedProjectInfo criteria, MatchCandidateRow candidate) {
        if (criteria.minItYears() != null && criteria.minItYears() > 0) {
            int years = candidate.itIndustryYears() != null ? candidate.itIndustryYears() : 0;
            if (years < criteria.minItYears()) {
                return false;
            }
        }
        return true;
    }

    private static boolean fitsProjectBudget(ParsedProjectInfo criteria, int employeePrice) {
        Integer max = criteria.maxUnitPrice();
        if (max != null && max > 0 && employeePrice > max) {
            return false;
        }
        return true;
    }

    private static int unitPriceScore(
            ParsedProjectInfo criteria,
            int employeePrice,
            List<String> required,
            List<String> matched
    ) {
        if (criteria.skipUnitPriceFilter()) {
            return 0;
        }
        if (!required.isEmpty() && matched.isEmpty()) {
            return 0;
        }
        Integer min = criteria.minUnitPrice();
        Integer max = criteria.maxUnitPrice();
        if (min == null && max == null) {
            return 0;
        }
        if (employeePrice <= 0) {
            return 0;
        }
        if (max != null && employeePrice > max) {
            return 0;
        }

        int effectiveMin = min != null ? min : 0;
        int effectiveMax = max != null ? max : effectiveMin;

        if (employeePrice >= effectiveMin && employeePrice <= effectiveMax) {
            return 10;
        }
        if (min != null && employeePrice < min) {
            return Math.max(3, (int) Math.round(8.0 * employeePrice / min));
        }
        if (max != null && employeePrice <= max) {
            return 6;
        }
        return 0;
    }

    private static int computeScore(
            ParsedProjectInfo criteria,
            MatchCandidateRow candidate,
            List<String> required,
            List<String> matched,
            List<String> optionalMatched,
            List<String> skillTokens
    ) {
        int skillScore;
        if (required.isEmpty()) {
            skillScore = 45;
        } else {
            skillScore = (int) Math.round(45.0 * matched.size() / required.size());
        }

        List<String> optional = normalizeSkills(criteria.optionalSkills());
        int optionalScore = 0;
        if (!optional.isEmpty()) {
            optionalScore = (int) Math.round(15.0 * optionalMatched.size() / optional.size());
        }

        int evalScore = evaluationScore(candidate.evaluation()) * 15 / 100;
        int langScore = (languageRank(candidate.japaneseLevel()) + languageRank(candidate.englishLevel())) * 3;
        int keywordScore = keywordScore(criteria.keywords(), candidate, skillTokens);
        int priceScore = unitPriceScore(criteria, candidate.unitPrice(), required, matched);

        int expScore = 0;
        if (criteria.minItYears() != null && criteria.minItYears() > 0 && candidate.itIndustryYears() != null) {
            expScore = Math.min(7, candidate.itIndustryYears() - criteria.minItYears() + 3);
            expScore = Math.max(0, expScore);
        } else if (candidate.itIndustryYears() != null && candidate.itIndustryYears() > 0) {
            expScore = Math.min(7, candidate.itIndustryYears());
        }

        int statusBonus = "待機中".equals(candidate.workStatus())
                || candidate.workStatus() == null
                || candidate.workStatus().isBlank()
                ? 7
                : 4;
        return Math.min(100, skillScore + optionalScore + evalScore + langScore + keywordScore + priceScore + expScore + statusBonus);
    }

    private static int keywordScore(
            List<String> keywords,
            MatchCandidateRow candidate,
            List<String> skillTokens
    ) {
        if (keywords == null || keywords.isEmpty()) {
            return 3;
        }
        String haystack = String.join(" ",
                nullToEmpty(candidate.name()),
                nullToEmpty(candidate.specialtyDev()),
                nullToEmpty(candidate.specialtyBusiness()),
                nullToEmpty(candidate.selfPr()),
                String.join(" ", skillTokens)
        ).toLowerCase(Locale.ROOT);

        int hits = 0;
        for (String keyword : keywords) {
            if (keyword == null || keyword.isBlank()) {
                continue;
            }
            if (haystack.contains(keyword.toLowerCase(Locale.ROOT))) {
                hits++;
            }
        }
        return Math.min(8, hits * 2);
    }

    private static List<String> normalizeSkills(List<String> skills) {
        if (skills == null) {
            return List.of();
        }
        Set<String> normalized = new LinkedHashSet<>();
        for (String skill : skills) {
            if (skill == null) {
                continue;
            }
            String trimmed = skill.trim();
            if (!trimmed.isEmpty()) {
                normalized.add(trimmed);
            }
        }
        return List.copyOf(normalized);
    }

    private static boolean containsSkill(List<String> tokens, String required) {
        String needle = required.toLowerCase(Locale.ROOT);
        for (String token : tokens) {
            if (token == null || token.isBlank()) {
                continue;
            }
            String hay = token.toLowerCase(Locale.ROOT);
            if (hay.contains(needle) || needle.contains(hay)) {
                return true;
            }
        }
        for (String part : splitSkillParts(required)) {
            if (part.length() < 2) {
                continue;
            }
            String partNeedle = part.toLowerCase(Locale.ROOT);
            for (String token : tokens) {
                if (token == null || token.isBlank()) {
                    continue;
                }
                String hay = token.toLowerCase(Locale.ROOT);
                if (hay.contains(partNeedle) || partNeedle.contains(hay)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static List<String> splitSkillParts(String skill) {
        List<String> parts = new ArrayList<>();
        for (String segment : skill.split("[/／、,・\\s]+")) {
            String trimmed = segment.trim();
            if (!trimmed.isEmpty()) {
                parts.add(trimmed);
            }
        }
        return parts;
    }

    private static int languageRank(String level) {
        if (level == null || level.isBlank()) {
            return 0;
        }
        return switch (level.trim().toUpperCase(Locale.ROOT)) {
            case "A" -> 4;
            case "B" -> 3;
            case "C" -> 2;
            case "D" -> 1;
            default -> 0;
        };
    }

    private static int evaluationScore(String evaluation) {
        if (evaluation == null || evaluation.isBlank()) {
            return 40;
        }
        char rank = Character.toUpperCase(evaluation.trim().charAt(0));
        return switch (rank) {
            case 'S' -> 100;
            case 'A' -> 80;
            case 'B' -> 60;
            case 'C' -> 40;
            case 'D' -> 20;
            default -> 40;
        };
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    public record MatchOutcome(
            boolean eligible,
            int matchScore,
            List<String> matchedSkills,
            List<String> missingSkills,
            List<String> matchedOptionalSkills
    ) {
        public static MatchOutcome rejected() {
            return new MatchOutcome(false, 0, List.of(), List.of(), List.of());
        }
    }
}
