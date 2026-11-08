package jp.dispatch.employee.dto;

import java.time.LocalDate;

/** 有給残台帳（今年度 / 前年度） */
public record PaidLeaveBalanceDto(
        long employeeId,
        int currentYearRemaining,
        int previousYearRemaining,
        LocalDate currentGrantDate,
        LocalDate previousGrantDate,
        int currentGrantDays,
        int previousGrantDays,
        String source
) {
    public int totalRemaining() {
        return Math.max(0, currentYearRemaining) + Math.max(0, previousYearRemaining);
    }
}
