package jp.dispatch.employee.dto;

import java.util.List;

public record ClientEventParticipantDto(
        long employeeId,
        String employeeCode,
        String employeeName,
        String departmentName,
        String position,
        String note
) {
}
