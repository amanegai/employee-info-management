package jp.dispatch.employee.dto;

import java.util.List;

public record DispatchProjectDto(
        long id,
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
        int headcountRequired,
        int headcountFilled,
        boolean headcountUnlimited,
        String projectRole,
        String interviewRounds,
        String status,
        Long ownerUserId,
        String ownerDisplayName,
        String notes,
        String periodNotes,
        boolean bpHelpRequested,
        String bpHelpRequestedAt,
        Long bpHelpRequestedBy,
        String bpHelpRequesterName,
        String bpHelpNote,
        Integer bpHelpSlotsNeeded,
        Long createdBy,
        String createdByName,
        Integer pendingReferralCount,
        String createdAt,
        String updatedAt,
        List<ProjectCandidateDto> candidates
) {
}
