package jp.dispatch.employee.dto;

import java.util.List;

public record ClientMeetingDto(
        long id,
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
        String createdByName,
        String createdAt,
        String updatedAt,
        List<ClientMeetingAttendeeDto> attendees,
        List<ClientIssueDto> tasks
) {
}
