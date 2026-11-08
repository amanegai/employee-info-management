package jp.dispatch.employee.dto;

public record EmployeeRequest(
        String employeeCode,
        String name,
        Long departmentId,
        String affiliationCompany,
        String position,
        String assignmentRole,
        String employeeType,
        String workStatus,
        int unitPrice,
        String evaluation,
        String endDate
) {
}
