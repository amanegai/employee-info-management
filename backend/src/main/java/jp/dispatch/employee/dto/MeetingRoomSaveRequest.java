package jp.dispatch.employee.dto;

public record MeetingRoomSaveRequest(
        String name,
        String floor,
        Integer capacity,
        String equipment,
        Integer slotMinutes,
        String businessStart,
        String businessEnd,
        Boolean active,
        Integer sortOrder
) {
}
