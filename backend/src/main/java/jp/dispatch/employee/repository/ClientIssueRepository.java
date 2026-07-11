package jp.dispatch.employee.repository;

import jp.dispatch.employee.dto.ClientIssueDto;
import jp.dispatch.employee.dto.EligibleParticipantDto;
import jp.dispatch.employee.config.DatabaseDialect;
import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class ClientIssueRepository {

    private final JdbcTemplate jdbc;
    private final DatabaseDialect dialect;

    public ClientIssueRepository(JdbcTemplate jdbc, DatabaseDialect dialect) {
        this.jdbc = jdbc;
        this.dialect = dialect;
    }

    public List<ClientIssueDto> search(
            String keyword,
            String status,
            String priority,
            String dateFrom,
            String dateTo,
            Long assigneeEmployeeId,
            Long meetingId,
            List<Long> scopeDepartmentIds
    ) {
        var sql = new StringBuilder("""
                SELECT ci.id, ci.client_name, ci.meeting_id, cm.title AS meeting_title,
                       ci.title, ci.description, ci.status, ci.priority, ci.due_date,
                       ci.assignee_employee_id, ae.name AS assignee_name,
                       ad.name AS assignee_department_name, ae.position AS assignee_position,
                       au.display_name AS created_by_name, ci.created_at, ci.updated_at
                FROM client_issue ci
                LEFT JOIN client_meeting cm ON cm.id = ci.meeting_id
                LEFT JOIN employee ae ON ae.id = ci.assignee_employee_id
                LEFT JOIN department ad ON ad.id = ae.department_id
                LEFT JOIN auth_user au ON au.id = ci.created_by
                WHERE 1=1
                """);
        var params = new ArrayList<Object>();

        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + keyword.trim() + "%";
            sql.append("""
                     AND (
                         """);
            sql.append(dialect.likeIgnoreCase("ci.client_name"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("ci.title"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("ci.description"));
            sql.append("""
                     )
                    """);
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND ci.status = ?");
            params.add(status.trim());
        }
        if (priority != null && !priority.isBlank()) {
            sql.append(" AND ci.priority = ?");
            params.add(priority.trim());
        }
        if (dateFrom != null && !dateFrom.isBlank()) {
            sql.append(" AND ").append(dialect.textDateGreaterOrEqualParam("ci.due_date"));
            params.add(dateFrom.trim());
        }
        if (dateTo != null && !dateTo.isBlank()) {
            sql.append(" AND ").append(dialect.textDateLessOrEqualParam("ci.due_date"));
            params.add(dateTo.trim());
        }
        if (assigneeEmployeeId != null && assigneeEmployeeId > 0) {
            sql.append(" AND ci.assignee_employee_id = ?");
            params.add(assigneeEmployeeId);
        }
        if (meetingId != null && meetingId > 0) {
            sql.append(" AND ci.meeting_id = ?");
            params.add(meetingId);
        }
        appendIssueScopeClause(sql, params, scopeDepartmentIds);
        sql.append(" ORDER BY CASE ci.status WHEN '対応中' THEN 0 WHEN '未着手' THEN 1 WHEN '保留' THEN 2 ELSE 3 END, ci.due_date IS NULL, ci.due_date ASC, ci.id DESC");

        return jdbc.query(
                sql.toString(),
                (rs, rowNum) -> mapIssue(rs),
                params.toArray()
        );
    }

    public Optional<ClientIssueDto> findById(long id) {
        List<ClientIssueDto> rows = jdbc.query(
                """
                SELECT ci.id, ci.client_name, ci.meeting_id, cm.title AS meeting_title,
                       ci.title, ci.description, ci.status, ci.priority, ci.due_date,
                       ci.assignee_employee_id, ae.name AS assignee_name,
                       ad.name AS assignee_department_name, ae.position AS assignee_position,
                       au.display_name AS created_by_name, ci.created_at, ci.updated_at
                FROM client_issue ci
                LEFT JOIN client_meeting cm ON cm.id = ci.meeting_id
                LEFT JOIN employee ae ON ae.id = ci.assignee_employee_id
                LEFT JOIN department ad ON ad.id = ae.department_id
                LEFT JOIN auth_user au ON au.id = ci.created_by
                WHERE ci.id = ?
                """,
                (rs, rowNum) -> mapIssue(rs),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public long insert(
            String clientName,
            Long meetingId,
            String title,
            String description,
            String status,
            String priority,
            String dueDate,
            Long assigneeEmployeeId,
            Long createdBy,
            String timestamp
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    """
                    INSERT INTO client_issue (
                        client_name, meeting_id, title, description, status, priority,
                        due_date, assignee_employee_id, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setString(1, clientName);
            if (meetingId != null && meetingId > 0) {
                ps.setLong(2, meetingId);
            } else {
                ps.setNull(2, java.sql.Types.INTEGER);
            }
            ps.setString(3, title);
            ps.setString(4, description);
            ps.setString(5, status);
            ps.setString(6, priority);
            ps.setString(7, dueDate);
            if (assigneeEmployeeId != null && assigneeEmployeeId > 0) {
                ps.setLong(8, assigneeEmployeeId);
            } else {
                ps.setNull(8, java.sql.Types.INTEGER);
            }
            if (createdBy != null && createdBy > 0) {
                ps.setLong(9, createdBy);
            } else {
                ps.setNull(9, java.sql.Types.INTEGER);
            }
            ps.setString(10, timestamp);
            ps.setString(11, timestamp);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "タスクの作成に失敗しました");
    }

    public boolean update(
            long id,
            String clientName,
            Long meetingId,
            String title,
            String description,
            String status,
            String priority,
            String dueDate,
            Long assigneeEmployeeId,
            String timestamp
    ) {
        int rows = jdbc.update(
                """
                UPDATE client_issue SET
                    client_name = ?, meeting_id = ?, title = ?, description = ?,
                    status = ?, priority = ?, due_date = ?, assignee_employee_id = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                clientName,
                meetingId,
                title,
                description,
                status,
                priority,
                dueDate,
                assigneeEmployeeId,
                timestamp,
                id
        );
        return rows > 0;
    }

    public boolean delete(long id) {
        return jdbc.update("DELETE FROM client_issue WHERE id = ?", id) > 0;
    }

    public boolean isAccessible(long issueId, List<Long> scopeDepartmentIds) {
        if (scopeDepartmentIds == null) {
            return true;
        }
        if (scopeDepartmentIds.isEmpty()) {
            return false;
        }
        var sql = new StringBuilder("""
                SELECT COUNT(DISTINCT ci.id) FROM client_issue ci
                WHERE ci.id = ?
                  AND (
                      ci.assignee_employee_id IS NULL
                      OR EXISTS (
                          SELECT 1 FROM employee e
                          WHERE e.id = ci.assignee_employee_id
                """);
        var params = new ArrayList<Object>();
        params.add(issueId);
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, "e");
        sql.append("))");
        Long count = jdbc.queryForObject(sql.toString(), Long.class, params.toArray());
        return count != null && count > 0;
    }

    public boolean employeeExists(Long employeeId) {
        if (employeeId == null || employeeId <= 0) {
            return true;
        }
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM employee WHERE id = ?",
                Long.class,
                employeeId
        );
        return count != null && count > 0;
    }

    public List<EligibleParticipantDto> findEligibleAssignees(List<Long> scopeDepartmentIds) {
        var sql = new StringBuilder("""
                SELECT e.id, e.employee_code, e.name, d.name AS department_name, e.position
                FROM employee e
                LEFT JOIN department d ON d.id = e.department_id
                WHERE e.work_status != '退職'
                """);
        var params = new ArrayList<Object>();
        appendEmployeeScopeClause(sql, params, scopeDepartmentIds, "e");
        sql.append(" ORDER BY e.employee_code");
        return jdbc.query(
                sql.toString(),
                (rs, rowNum) -> new EligibleParticipantDto(
                        rs.getLong("id"),
                        rs.getString("employee_code"),
                        rs.getString("name"),
                        rs.getString("department_name"),
                        rs.getString("position")
                ),
                params.toArray()
        );
    }

    private ClientIssueDto mapIssue(java.sql.ResultSet rs) throws java.sql.SQLException {
        long meetingIdValue = rs.getLong("meeting_id");
        Long meetingId = rs.wasNull() ? null : meetingIdValue;
        long assigneeIdValue = rs.getLong("assignee_employee_id");
        Long assigneeEmployeeId = rs.wasNull() ? null : assigneeIdValue;
        return new ClientIssueDto(
                rs.getLong("id"),
                rs.getString("client_name"),
                meetingId,
                rs.getString("meeting_title"),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getString("priority"),
                rs.getString("due_date"),
                assigneeEmployeeId,
                rs.getString("assignee_name"),
                rs.getString("assignee_department_name"),
                rs.getString("assignee_position"),
                rs.getString("created_by_name"),
                rs.getString("created_at"),
                rs.getString("updated_at")
        );
    }

    private void appendIssueScopeClause(StringBuilder sql, List<Object> params, List<Long> scopeDepartmentIds) {
        if (scopeDepartmentIds == null) {
            return;
        }
        if (scopeDepartmentIds.isEmpty()) {
            sql.append(" AND 1=0");
            return;
        }
        sql.append("""
                 AND (
                     ci.assignee_employee_id IS NULL
                     OR EXISTS (
                         SELECT 1 FROM employee e
                         WHERE e.id = ci.assignee_employee_id
                """);
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, "e");
        sql.append("))");
    }

    private void appendEmployeeScopeClause(
            StringBuilder sql,
            List<Object> params,
            List<Long> scopeDepartmentIds,
            String tableAlias
    ) {
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, tableAlias);
    }
}
