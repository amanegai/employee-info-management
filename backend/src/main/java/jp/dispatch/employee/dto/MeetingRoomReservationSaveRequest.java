package jp.dispatch.employee.dto;

public record MeetingRoomReservationSaveRequest(
        Long roomId,
        String title,
        String startAt,
        String endAt,
        String description
) {
}
