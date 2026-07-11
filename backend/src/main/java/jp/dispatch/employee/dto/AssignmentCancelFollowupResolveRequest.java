package jp.dispatch.employee.dto;

public record AssignmentCancelFollowupResolveRequest(
        String notes,
        Boolean reProposedInOtherProject,
        Boolean reMatched
) {
}
