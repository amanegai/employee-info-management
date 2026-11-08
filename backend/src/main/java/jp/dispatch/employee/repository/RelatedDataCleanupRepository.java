package jp.dispatch.employee.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RelatedDataCleanupRepository {

    private final JdbcTemplate jdbc;

    public RelatedDataCleanupRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void deleteEmployeeRelations(long employeeId) {
        jdbc.update(
                """
                DELETE FROM assignment_cancel_followup
                WHERE employee_id = ?
                   OR assignment_id IN (
                       SELECT id FROM employee_project_assignment WHERE employee_id = ?
                   )
                """,
                employeeId,
                employeeId
        );
        jdbc.update("DELETE FROM employee_status_suggestion WHERE employee_id = ?", employeeId);
        jdbc.update("DELETE FROM employee_project_assignment WHERE employee_id = ?", employeeId);
        jdbc.update("DELETE FROM project_candidate WHERE employee_id = ?", employeeId);
        jdbc.update("DELETE FROM employee_paid_leave_balance WHERE employee_id = ?", employeeId);
        jdbc.update("DELETE FROM employee_status_change_log WHERE employee_id = ?", employeeId);
        jdbc.update("DELETE FROM client_event_participant WHERE employee_id = ?", employeeId);
        jdbc.update("DELETE FROM client_event_reminder_log WHERE employee_id = ?", employeeId);
        jdbc.update("DELETE FROM client_meeting_attendee WHERE employee_id = ?", employeeId);
        jdbc.update(
                "UPDATE client_issue SET assignee_employee_id = NULL WHERE assignee_employee_id = ?",
                employeeId
        );
    }

    public void deleteProjectRelations(long projectId) {
        jdbc.update(
                """
                DELETE FROM assignment_cancel_followup
                WHERE project_id = ?
                   OR assignment_id IN (
                       SELECT id FROM employee_project_assignment WHERE project_id = ?
                   )
                """,
                projectId,
                projectId
        );
        jdbc.update(
                """
                DELETE FROM employee_status_suggestion
                WHERE source_assignment_id IN (
                    SELECT id FROM employee_project_assignment WHERE project_id = ?
                )
                """,
                projectId
        );
        jdbc.update("DELETE FROM employee_project_assignment WHERE project_id = ?", projectId);
        jdbc.update("DELETE FROM project_candidate WHERE project_id = ?", projectId);
    }
}
