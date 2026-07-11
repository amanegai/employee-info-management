package jp.dispatch.employee.dto;

public record SummaryDto(
        long activeCount,
        long workingCount,
        long standbyCount,
        long endingThisMonthCount
) {
}
