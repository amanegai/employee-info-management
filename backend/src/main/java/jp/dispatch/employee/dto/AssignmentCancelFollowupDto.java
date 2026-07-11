package jp.dispatch.employee.dto;

public record AssignmentCancelFollowupDto(
        long id,
        long employeeId,
        String employeeCode,
        String employeeName,
        Long assignmentId,
        Long projectId,
        String projectName,
        String clientName,
        String cancelReason,
        String status,
        Long assignedTo,
        String assignedToDisplayName,
        String dueDate,
        String notes,
        Long createdBy,
        String createdByDisplayName,
        String createdAt,
        String resolvedAt,
        Long resolvedBy,
        String resolvedByDisplayName,
        boolean overdue
) {
}
