package jp.dispatch.employee.paidleave;

import jp.dispatch.employee.dto.PaidLeaveBalanceDto;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PaidLeaveExpirationTest {

    @Test
    void expiresOnSecondAnniversary() {
        LocalDate grant = LocalDate.of(2023, 10, 1);
        assertFalse(PaidLeaveExpiration.isExpired(grant, LocalDate.of(2025, 9, 30)));
        assertTrue(PaidLeaveExpiration.isExpired(grant, LocalDate.of(2025, 10, 1)));
    }

    @Test
    void clearsPreviousYearWhenExpired() {
        PaidLeaveBalanceDto balance = new PaidLeaveBalanceDto(
                1L,
                11,
                5,
                LocalDate.of(2024, 10, 1),
                LocalDate.of(2023, 10, 1),
                11,
                10,
                "GRANT_ROLLOVER"
        );
        PaidLeaveBalanceDto applied = PaidLeaveExpiration.apply(balance, LocalDate.of(2025, 10, 1));
        assertEquals(11, applied.currentYearRemaining());
        assertEquals(0, applied.previousYearRemaining());
        assertEquals("EXPIRED", applied.source());
    }

    @Test
    void noChangeWhenStillValid() {
        PaidLeaveBalanceDto balance = new PaidLeaveBalanceDto(
                1L,
                11,
                5,
                LocalDate.of(2024, 10, 1),
                LocalDate.of(2023, 10, 1),
                11,
                10,
                "GRANT_ROLLOVER"
        );
        PaidLeaveBalanceDto applied = PaidLeaveExpiration.apply(balance, LocalDate.of(2025, 9, 30));
        assertSame(balance, applied);
    }
}
