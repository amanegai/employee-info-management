package jp.dispatch.employee.dto;

public record HrOpsClientActiveEmployeeDto(
        long employeeId,
        String employeeCode,
        String employeeName,
        String projectName
) {
}
