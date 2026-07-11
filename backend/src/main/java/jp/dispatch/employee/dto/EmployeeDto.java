package jp.dispatch.employee.dto;

public record EmployeeDto(
        long id,
        String employeeCode,
        String name,
        String nameKana,
        Long departmentId,
        String departmentName,
        String position,
        String assignmentRole,
        String employeeType,
        String workStatus,
        int unitPrice,
        String evaluation,
        String endDate,
        boolean evaluationCalculated
) {
}
