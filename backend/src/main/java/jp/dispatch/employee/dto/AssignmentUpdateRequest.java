package jp.dispatch.employee.dto;

public record AssignmentUpdateRequest(
        String startDate,
        String endDate,
        String notes
) {
}
