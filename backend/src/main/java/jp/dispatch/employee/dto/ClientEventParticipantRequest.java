package jp.dispatch.employee.dto;

import java.util.List;

public record ClientEventParticipantRequest(
        Long employeeId,
        String note
) {
}
