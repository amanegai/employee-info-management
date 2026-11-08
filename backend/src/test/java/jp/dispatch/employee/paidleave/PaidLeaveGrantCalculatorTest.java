package jp.dispatch.employee.paidleave;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PaidLeaveGrantCalculatorTest {

    @Test
    void firstGrantIsSixMonthsAndTenDays() {
        LocalDate hire = LocalDate.of(2024, 4, 1);
        var grant = PaidLeaveGrantCalculator.latestGrant(hire, LocalDate.of(2024, 10, 1));
        assertTrue(grant.isPresent());
        assertEquals(LocalDate.of(2024, 10, 1), grant.get().grantDate());
        assertEquals(10, grant.get().grantDays());
        assertEquals(0, grant.get().grantIndex());
    }

    @Test
    void beforeFirstGrantIsEmpty() {
        LocalDate hire = LocalDate.of(2024, 4, 1);
        assertTrue(PaidLeaveGrantCalculator.latestGrant(hire, LocalDate.of(2024, 9, 30)).isEmpty());
    }

    @Test
    void secondGrantIsElevenDays() {
        LocalDate hire = LocalDate.of(2023, 4, 1);
        var grant = PaidLeaveGrantCalculator.latestGrant(hire, LocalDate.of(2024, 10, 1));
        assertTrue(grant.isPresent());
        assertEquals(1, grant.get().grantIndex());
        assertEquals(11, grant.get().grantDays());
        assertEquals(LocalDate.of(2024, 10, 1), grant.get().grantDate());
    }

    @Test
    void sixthPlusGrantIsTwentyDays() {
        LocalDate hire = LocalDate.of(2018, 4, 1);
        var grant = PaidLeaveGrantCalculator.latestGrant(hire, LocalDate.of(2025, 10, 1));
        assertTrue(grant.isPresent());
        assertEquals(20, grant.get().grantDays());
    }
}
