package jp.dispatch.employee.dto;

public record EmployeeDto(
        long id,
        String employeeCode,
        String name,
        String nameKana,
        Long departmentId,
        String departmentName,
        String affiliationCompany,
        String position,
        String assignmentRole,
        String employeeType,
        String workStatus,
        int unitPrice,
        String evaluation,
        String endDate,
        boolean evaluationCalculated,
        int version,
        String updatedAt,
        String updatedByName
) {
}
