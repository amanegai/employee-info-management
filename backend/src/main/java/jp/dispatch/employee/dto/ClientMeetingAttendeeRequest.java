package jp.dispatch.employee.dto;

public record ClientMeetingAttendeeRequest(
        Long employeeId,
        String note
) {
}
