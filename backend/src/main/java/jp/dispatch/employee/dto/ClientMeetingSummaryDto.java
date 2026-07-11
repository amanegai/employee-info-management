package jp.dispatch.employee.dto;

public record ClientMeetingSummaryDto(
        long id,
        String clientName,
        String title,
        String meetingDate
) {
}
