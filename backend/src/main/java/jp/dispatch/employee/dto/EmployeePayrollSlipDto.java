package jp.dispatch.employee.dto;

public record EmployeePayrollSlipDto(
        long fileId,
        String originalName,
        String targetMonth,
        String createdAt,
        String uploadedByName
) {
}
