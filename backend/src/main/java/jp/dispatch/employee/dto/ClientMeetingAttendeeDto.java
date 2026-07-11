package jp.dispatch.employee.dto;

public record ClientMeetingAttendeeDto(
        long employeeId,
        String employeeCode,
        String employeeName,
        String departmentName,
        String position,
        String note
) {
}
