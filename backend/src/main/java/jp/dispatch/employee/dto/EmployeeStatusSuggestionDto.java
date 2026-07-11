package jp.dispatch.employee.dto;

public record EmployeeStatusSuggestionDto(
        long id,
        long employeeId,
        String employeeCode,
        String employeeName,
        String currentWorkStatus,
        String currentEndDate,
        String suggestedStatus,
        String suggestedEndDate,
        String reason,
        Long sourceAssignmentId,
        String status,
        String createdAt
) {
}
