package jp.dispatch.employee.dto;

import java.util.List;

public record ClientEventSaveRequest(
        Long clientId,
        String clientName,
        String eventName,
        String eventDate,
        String eventTime,
        String location,
        String eventType,
        String eventStatus,
        String notes,
        List<ClientEventParticipantRequest> participants
) {
}
