package jp.dispatch.employee.dto;

public record HrOpsRequestDto(
        long id,
        String requestType,
        String title,
        String description,
        Long employeeId,
        String employeeName,
        String employeeCode,
        long requesterId,
        String requesterName,
        String status,
        Long assignedTo,
        String assigneeName,
        String dueDate,
        String hrNotes,
        String rejectReason,
        String createdAt,
        String updatedAt,
        String submittedAt,
        String resolvedAt,
        Long resolvedBy,
        String resolverName
) {
}
