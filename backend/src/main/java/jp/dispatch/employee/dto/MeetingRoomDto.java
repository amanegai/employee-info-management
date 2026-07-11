package jp.dispatch.employee.dto;

public record MeetingRoomDto(
        long id,
        String name,
        String floor,
        Integer capacity,
        String equipment,
        int slotMinutes,
        String businessStart,
        String businessEnd,
        boolean active,
        int sortOrder,
        String createdAt,
        String updatedAt
) {
}
