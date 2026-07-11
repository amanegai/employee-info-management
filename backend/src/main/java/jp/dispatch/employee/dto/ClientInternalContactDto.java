package jp.dispatch.employee.dto;

public record ClientInternalContactDto(
        Long id,
        String contactName,
        Long employeeId,
        String department,
        String position,
        String phone,
        String email,
        String clientDepartment,
        String responsibility,
        String notes,
        int sortOrder
) {
}
