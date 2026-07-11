package jp.dispatch.employee.dto;

import java.util.List;

public record ClientEventDto(
        long id,
        Long clientId,
        String clientName,
        String eventName,
        String eventDate,
        String eventTime,
        String location,
        String eventType,
        String eventStatus,
        String notes,
        String createdByName,
        String createdAt,
        String updatedAt,
        List<ClientEventParticipantDto> participants
) {
}
