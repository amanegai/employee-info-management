package jp.dispatch.employee.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class EmployeeStatusChangeLogRepository {

    private final JdbcTemplate jdbc;

    public EmployeeStatusChangeLogRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(
            long employeeId,
            String oldWorkStatus,
            String newWorkStatus,
            String oldEndDate,
            String newEndDate,
            String triggerType,
            Long triggerRefId,
            String reason,
            Long appliedBy
    ) {
        jdbc.update(
                """
                INSERT INTO employee_status_change_log (
                    employee_id, old_work_status, new_work_status, old_end_date, new_end_date,
                    trigger_type, trigger_ref_id, reason, applied_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                employeeId,
                oldWorkStatus,
                newWorkStatus,
                oldEndDate,
                newEndDate,
                triggerType,
                triggerRefId,
                reason,
                appliedBy
        );
    }
}
