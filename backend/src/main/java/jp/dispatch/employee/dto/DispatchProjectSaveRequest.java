package jp.dispatch.employee.dto;

public record DispatchProjectSaveRequest(
        Long clientId,
        String clientName,
        String projectName,
        String projectText,
        String requiredSkills,
        String optionalSkills,
        Integer billingUnitPrice,
        String billingPriceLabel,
        String workLocation,
        String expectedStartDate,
        String expectedEndDate,
        Integer headcountRequired,
        Boolean headcountUnlimited,
        String projectRole,
        String interviewRounds,
        Long ownerUserId,
        String notes,
        String periodNotes
) {
}
