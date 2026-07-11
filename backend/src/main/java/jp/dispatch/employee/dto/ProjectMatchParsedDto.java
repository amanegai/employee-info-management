package jp.dispatch.employee.dto;

import java.util.List;

public record ProjectMatchParsedDto(
        String projectName,
        List<String> requiredSkills,
        List<String> optionalSkills,
        Integer minUnitPrice,
        Integer maxUnitPrice,
        Integer minItYears,
        List<String> keywords,
        String workSummary,
        String workLocation,
        Integer headcountRequired,
        boolean headcountUnlimited,
        String projectRole,
        String billingPriceLabel,
        boolean skillBasedPrice,
        String interviewRounds,
        String notes,
        String expectedStartDate,
        String periodNotes
) {
}
