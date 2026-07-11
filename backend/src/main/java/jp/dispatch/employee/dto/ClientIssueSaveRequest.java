package jp.dispatch.employee.dto;

public record ClientIssueSaveRequest(
        String clientName,
        Long meetingId,
        String title,
        String description,
        String status,
        String priority,
        String dueDate,
        Long assigneeEmployeeId
) {
}
