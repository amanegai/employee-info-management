package jp.dispatch.employee.dto;

public record BpHelpReferralStageRequest(
        String stage,
        String interviewAt,
        String note
) {
}
