package jp.dispatch.employee.dto;

public record HrOpsRequestSaveRequest(
        String requestType,
        String title,
        String description,
        Long employeeId,
        String dueDate
) {
}
