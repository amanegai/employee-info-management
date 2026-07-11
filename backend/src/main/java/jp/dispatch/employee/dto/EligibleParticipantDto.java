package jp.dispatch.employee.dto;

public record EligibleParticipantDto(
        long id,
        String employeeCode,
        String name,
        String departmentName,
        String position
) {
}
