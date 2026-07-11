package jp.dispatch.employee.dto;

public record MeetingRoomReservationDto(
        long id,
        long roomId,
        String roomName,
        String title,
        String startAt,
        String endAt,
        long reservedBy,
        String reservedByName,
        String description,
        String status,
        boolean ownedByCurrentUser,
        String createdAt,
        String updatedAt
) {
}
