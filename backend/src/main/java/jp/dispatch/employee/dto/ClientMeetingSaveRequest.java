package jp.dispatch.employee.dto;

import java.util.List;

public record ClientMeetingSaveRequest(
        Long clientId,
        String clientName,
        String clientContactPerson,
        String title,
        String meetingDate,
        String meetingTime,
        String location,
        String agenda,
        String minutesBody,
        String issuesSummary,
        List<ClientMeetingAttendeeRequest> attendees,
        List<ClientTaskSaveRequest> tasks
) {
}
