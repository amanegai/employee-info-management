package jp.dispatch.employee.dto;

public record CandidateStageRequest(
        String stage,
        String notes,
        String interviewAt
) {
}
