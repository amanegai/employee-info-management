package jp.dispatch.employee.repository;

import jp.dispatch.employee.dto.PaidLeaveBalanceDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public class PaidLeaveBalanceRepository {

    private final JdbcTemplate jdbc;

    public PaidLeaveBalanceRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<PaidLeaveBalanceDto> findByEmployeeId(long employeeId) {
        List<PaidLeaveBalanceDto> rows = jdbc.query(
                """
                SELECT employee_id, current_year_remaining, previous_year_remaining,
                       current_grant_date, previous_grant_date,
                       current_grant_days, previous_grant_days, source
                FROM employee_paid_leave_balance
                WHERE employee_id = ?
                """,
                (rs, rowNum) -> mapRow(rs),
                employeeId
        );
        return rows.stream().findFirst();
    }

    public void upsert(PaidLeaveBalanceDto balance) {
        jdbc.update(
                """
                INSERT INTO employee_paid_leave_balance (
                    employee_id, current_year_remaining, previous_year_remaining,
                    current_grant_date, previous_grant_date,
                    current_grant_days, previous_grant_days, source, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON CONFLICT (employee_id) DO UPDATE SET
                    current_year_remaining = EXCLUDED.current_year_remaining,
                    previous_year_remaining = EXCLUDED.previous_year_remaining,
                    current_grant_date = EXCLUDED.current_grant_date,
                    previous_grant_date = EXCLUDED.previous_grant_date,
                    current_grant_days = EXCLUDED.current_grant_days,
                    previous_grant_days = EXCLUDED.previous_grant_days,
                    source = EXCLUDED.source,
                    updated_at = NOW()
                """,
                balance.employeeId(),
                balance.currentYearRemaining(),
                balance.previousYearRemaining(),
                toSqlDate(balance.currentGrantDate()),
                toSqlDate(balance.previousGrantDate()),
                balance.currentGrantDays(),
                balance.previousGrantDays(),
                balance.source()
        );
    }

    public void deleteByEmployeeId(long employeeId) {
        jdbc.update("DELETE FROM employee_paid_leave_balance WHERE employee_id = ?", employeeId);
    }

    public List<Long> findEmployeeIdsMissingBalance() {
        return jdbc.query(
                """
                SELECT e.id
                FROM employee e
                INNER JOIN employee_hr hr ON hr.employee_id = e.id
                LEFT JOIN employee_paid_leave_balance b ON b.employee_id = e.id
                WHERE b.employee_id IS NULL
                  AND e.employee_type = ?
                  AND (e.work_status IS DISTINCT FROM ?)
                  AND hr.hire_date IS NOT NULL
                  AND TRIM(hr.hire_date) <> ''
                """,
                (rs, rowNum) -> rs.getLong("id"),
                ELIGIBLE_EMPLOYEE_TYPE,
                RESIGNED_WORK_STATUS
        );
    }

    /** 有給対象（正社員・未退職）かつ入社日あり。退職予定は含む。 */
    public List<Long> findEligibleEmployeeIdsWithHireDate() {
        return jdbc.query(
                """
                SELECT e.id
                FROM employee e
                INNER JOIN employee_hr hr ON hr.employee_id = e.id
                WHERE e.employee_type = ?
                  AND (e.work_status IS DISTINCT FROM ?)
                  AND hr.hire_date IS NOT NULL
                  AND TRIM(hr.hire_date) <> ''
                """,
                (rs, rowNum) -> rs.getLong("id"),
                ELIGIBLE_EMPLOYEE_TYPE,
                RESIGNED_WORK_STATUS
        );
    }

    /**
     * 台帳削除対象：正社員以外、または稼働状況が退職。
     * 退職予定は対象外（台帳を残す）。
     */
    public List<Long> findIneligibleBalanceEmployeeIds() {
        return jdbc.query(
                """
                SELECT b.employee_id
                FROM employee_paid_leave_balance b
                INNER JOIN employee e ON e.id = b.employee_id
                WHERE e.employee_type IS DISTINCT FROM ?
                   OR e.work_status = ?
                """,
                (rs, rowNum) -> rs.getLong("employee_id"),
                ELIGIBLE_EMPLOYEE_TYPE,
                RESIGNED_WORK_STATUS
        );
    }

    public Optional<String> findEmployeeType(long employeeId) {
        List<String> rows = jdbc.query(
                "SELECT employee_type FROM employee WHERE id = ?",
                (rs, rowNum) -> rs.getString("employee_type"),
                employeeId
        );
        return rows.stream().findFirst();
    }

    public Optional<String> findWorkStatus(long employeeId) {
        List<String> rows = jdbc.query(
                "SELECT work_status FROM employee WHERE id = ?",
                (rs, rowNum) -> rs.getString("work_status"),
                employeeId
        );
        return rows.stream().findFirst();
    }

    public Optional<String> findHireDate(long employeeId) {
        List<String> rows = jdbc.query(
                """
                SELECT hire_date FROM employee_hr
                WHERE employee_id = ?
                  AND hire_date IS NOT NULL
                  AND TRIM(hire_date) <> ''
                """,
                (rs, rowNum) -> rs.getString("hire_date"),
                employeeId
        );
        return rows.stream().findFirst();
    }

    /** 有給付与対象の社員種別（正社員のみ） */
    public static final String ELIGIBLE_EMPLOYEE_TYPE = "正社員";

    /** 有給台帳を保持しない稼働状況（退職予定は含まない） */
    public static final String RESIGNED_WORK_STATUS = "退職";

    private static PaidLeaveBalanceDto mapRow(ResultSet rs) throws SQLException {
        return new PaidLeaveBalanceDto(
                rs.getLong("employee_id"),
                rs.getInt("current_year_remaining"),
                rs.getInt("previous_year_remaining"),
                toLocalDate(rs.getDate("current_grant_date")),
                toLocalDate(rs.getDate("previous_grant_date")),
                rs.getInt("current_grant_days"),
                rs.getInt("previous_grant_days"),
                rs.getString("source")
        );
    }

    private static Date toSqlDate(LocalDate date) {
        return date == null ? null : Date.valueOf(date);
    }

    private static LocalDate toLocalDate(Date date) {
        return date == null ? null : date.toLocalDate();
    }
}
