package jp.dispatch.employee.paidleave;

import java.time.LocalDate;
import java.util.Optional;

/**
 * 入社日基準の法定標準付与（方案A：個人基準日）。
 * 初回付与 = 入社日 + 6か月、以降毎年同日。
 */
public final class PaidLeaveGrantCalculator {

    private PaidLeaveGrantCalculator() {
    }

    /** 連続勤務年数に応じた付与日数（満了時点の付与）。 */
    public static int grantDaysForGrantIndex(int grantIndex) {
        if (grantIndex < 0) {
            return 0;
        }
        return switch (grantIndex) {
            case 0 -> 10;
            case 1 -> 11;
            case 2 -> 12;
            case 3 -> 14;
            case 4 -> 16;
            case 5 -> 18;
            default -> 20;
        };
    }

    public static LocalDate firstGrantDate(LocalDate hireDate) {
        return hireDate.plusMonths(6);
    }

    public static LocalDate grantDate(LocalDate hireDate, int grantIndex) {
        return firstGrantDate(hireDate).plusYears(grantIndex);
    }

    /**
     * asOf 時点で既に到来している最新付与。未到来なら empty。
     */
    public static Optional<GrantInfo> latestGrant(LocalDate hireDate, LocalDate asOf) {
        if (hireDate == null || asOf == null) {
            return Optional.empty();
        }
        LocalDate first = firstGrantDate(hireDate);
        if (asOf.isBefore(first)) {
            return Optional.empty();
        }
        int index = 0;
        LocalDate current = first;
        while (true) {
            LocalDate next = grantDate(hireDate, index + 1);
            if (asOf.isBefore(next)) {
                LocalDate previousDate = index > 0 ? grantDate(hireDate, index - 1) : null;
                Integer previousDays = index > 0 ? grantDaysForGrantIndex(index - 1) : null;
                return Optional.of(new GrantInfo(
                        index,
                        current,
                        grantDaysForGrantIndex(index),
                        previousDate,
                        previousDays
                ));
            }
            index++;
            current = next;
            if (index > 80) {
                // 安全弁
                return Optional.of(new GrantInfo(
                        index,
                        current,
                        grantDaysForGrantIndex(index),
                        grantDate(hireDate, index - 1),
                        grantDaysForGrantIndex(index - 1)
                ));
            }
        }
    }

    public record GrantInfo(
            int grantIndex,
            LocalDate grantDate,
            int grantDays,
            LocalDate previousGrantDate,
            Integer previousGrantDays
    ) {
    }
}
