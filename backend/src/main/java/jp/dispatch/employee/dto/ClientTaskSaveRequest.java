package jp.dispatch.employee.dto;

public record ClientTaskSaveRequest(
        Long id,
        String title,
        String description,
        String status,
        String priority,
        String dueDate,
        Long assigneeEmployeeId
) {
}
