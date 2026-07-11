package jp.dispatch.employee.dto;

public record EmployeeProjectAssignmentDto(
        long id,
        long employeeId,
        long projectId,
        Long candidateId,
        String clientName,
        String projectName,
        String status,
        String startDate,
        String endDate,
        boolean primary,
        String notes,
        String confirmedAt,
        String createdAt,
        String updatedAt
) {
}
