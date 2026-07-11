package jp.dispatch.employee.dto;

public record ClientEventOverlapDto(
        long employeeId,
        String employeeName,
        long conflictingEventId,
        String conflictingEventName,
        String conflictingClientName,
        String conflictingEventDate,
        String conflictingEventTime,
        String conflictingEventStatus,
        boolean sameDayOnly
) {
}
