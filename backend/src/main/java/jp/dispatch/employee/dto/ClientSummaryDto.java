package jp.dispatch.employee.dto;

public record ClientSummaryDto(
        int activeContractCount,
        int negotiatingCount,
        int suspendedCount,
        int newCount
) {
}
