package jp.dispatch.employee.dto;

public record ClientIssueDto(
        long id,
        String clientName,
        Long meetingId,
        String meetingTitle,
        String title,
        String description,
        String status,
        String priority,
        String dueDate,
        Long assigneeEmployeeId,
        String assigneeName,
        String assigneeDepartmentName,
        String assigneePosition,
        String createdByName,
        String createdAt,
        String updatedAt
) {
}
