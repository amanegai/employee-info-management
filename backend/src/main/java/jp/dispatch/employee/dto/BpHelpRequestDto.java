package jp.dispatch.employee.dto;

public record BpHelpRequestDto(
        String note,
        Integer slotsNeeded
) {
}
