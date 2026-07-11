package jp.dispatch.employee.dto;

public record ClientInternalContactCandidateDto(
        long id,
        String employeeCode,
        String name,
        String departmentName,
        String position,
        String phone,
        String email
) {
}
