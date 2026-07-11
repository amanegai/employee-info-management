package jp.dispatch.employee.dto;

public record CandidateConfirmRequest(
        String startDate,
        String endDate,
        String notes
) {
}
