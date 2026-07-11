package jp.dispatch.employee.dto;

public record AssignmentCancelRequest(
        String cancelReason,
        String notes
) {
}
