package jp.dispatch.employee.paidleave;

import jp.dispatch.employee.dto.PaidLeaveBalanceDto;

import java.time.LocalDate;

/**
 * 有給付与の時効（付与日から 2 年で消滅）。
 */
public final class PaidLeaveExpiration {

    public static final int VALIDITY_YEARS = 2;

    private PaidLeaveExpiration() {
    }

    /** asOf が付与日の 2 年後以降なら消滅済み。 */
    public static boolean isExpired(LocalDate grantDate, LocalDate asOf) {
        if (grantDate == null || asOf == null) {
            return false;
        }
        return !asOf.isBefore(grantDate.plusYears(VALIDITY_YEARS));
    }

    /**
     * 満了した年度残を 0 にする。変更がなければ同一インスタンスを返す。
     */
    public static PaidLeaveBalanceDto apply(PaidLeaveBalanceDto balance, LocalDate asOf) {
        if (balance == null || asOf == null) {
            return balance;
        }
        int current = Math.max(0, balance.currentYearRemaining());
        int previous = Math.max(0, balance.previousYearRemaining());
        boolean changed = false;

        if (isExpired(balance.previousGrantDate(), asOf) && previous > 0) {
            previous = 0;
            changed = true;
        }
        if (isExpired(balance.currentGrantDate(), asOf) && current > 0) {
            current = 0;
            changed = true;
        }
        if (!changed) {
            return balance;
        }
        return new PaidLeaveBalanceDto(
                balance.employeeId(),
                current,
                previous,
                balance.currentGrantDate(),
                balance.previousGrantDate(),
                balance.currentGrantDays(),
                balance.previousGrantDays(),
                "EXPIRED"
        );
    }
}
