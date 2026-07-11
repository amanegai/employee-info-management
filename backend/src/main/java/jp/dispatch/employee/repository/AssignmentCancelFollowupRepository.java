package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.DatabaseDialect;
import jp.dispatch.employee.dto.AssignmentCancelFollowupDto;
import org.springframework.jdbc.core.JdbcTemplate;
import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class AssignmentCancelFollowupRepository {
    private static final String SELECT_COLUMNS = """
            SELECT f.id, f.employee_id, e.employee_code, e.name AS employee_name,
                   f.assignment_id, f.project_id, p.project_name, p.client_name,
                   f.cancel_reason, f.status, f.assigned_to,
                   au.display_name AS assigned_to_display_name,
                   f.due_date, f.notes, f.created_by,
                   cu.display_name AS created_by_display_name,
                   f.created_at, f.resolved_at, f.resolved_by,
                   ru.display_name AS resolved_by_display_name
            FROM assignment_cancel_followup f
            JOIN employee e ON e.id = f.employee_id
            LEFT JOIN dispatch_project p ON p.id = f.project_id
            LEFT JOIN auth_user au ON au.id = f.assigned_to
            LEFT JOIN auth_user cu ON cu.id = f.created_by
            LEFT JOIN auth_user ru ON ru.id = f.resolved_by
            """;

    private final JdbcTemplate jdbc;
    private final DatabaseDialect dialect;

    public AssignmentCancelFollowupRepository(JdbcTemplate jdbc, DatabaseDialect dialect) {
        this.jdbc = jdbc;
        this.dialect = dialect;
    }

    public List<AssignmentCancelFollowupDto> findVisible(
            String status,
            Long employeeId,
            Long viewerUserId,
            boolean viewerIsAdmin
    ) {
        var sql = new StringBuilder(SELECT_COLUMNS + " WHERE 1=1");
        var params = new ArrayList<Object>();
        appendStatusFilter(sql, params, status);
        if (employeeId != null) {
            sql.append(" AND f.employee_id = ?");
            params.add(employeeId);
        }
        if (!viewerIsAdmin && viewerUserId != null) {
            sql.append(" AND (f.assigned_to = ? OR f.created_by = ?)");
            params.add(viewerUserId);
            params.add(viewerUserId);
        } else if (!viewerIsAdmin) {
            sql.append(" AND 1=0");
        }
        sql.append(" ORDER BY f.due_date ASC, f.created_at DESC, f.id DESC");
        return jdbc.query(sql.toString(), (rs, rowNum) -> mapRow(rs), params.toArray());
    }

    public int countOpenVisible(Long viewerUserId, boolean viewerIsAdmin) {
        var sql = new StringBuilder("""
                SELECT COUNT(*)
                FROM assignment_cancel_followup f
                WHERE f.status = 'OPEN'
                """);
        var params = new ArrayList<Object>();
        if (!viewerIsAdmin && viewerUserId != null) {
            sql.append(" AND (f.assigned_to = ? OR f.created_by = ?)");
            params.add(viewerUserId);
            params.add(viewerUserId);
        } else if (!viewerIsAdmin) {
            return 0;
        }
        Long count = jdbc.queryForObject(sql.toString(), Long.class, params.toArray());
        return count != null ? count.intValue() : 0;
    }

    public List<OverdueFollowupRow> findOverdueOpen(String today) {
        return jdbc.query(
                """
                SELECT f.id, f.employee_id, e.name AS employee_name,
                       f.project_id, p.project_name, p.client_name,
                       f.due_date, f.notes, f.assigned_to
                FROM assignment_cancel_followup f
                JOIN employee e ON e.id = f.employee_id
                LEFT JOIN dispatch_project p ON p.id = f.project_id
                WHERE f.status = 'OPEN'
                  AND f.due_date IS NOT NULL
                  """
                + "AND " + dialect.textDateLessThanParam("f.due_date")
                + " ORDER BY f.due_date ASC, f.id ASC",
                (rs, rowNum) -> new OverdueFollowupRow(
                        rs.getLong("id"),
                        rs.getLong("employee_id"),
                        rs.getString("employee_name"),
                        readNullableLong(rs, "project_id"),
                        rs.getString("project_name"),
                        rs.getString("client_name"),
                        rs.getString("due_date"),
                        rs.getString("notes"),
                        readNullableLong(rs, "assigned_to")
                ),
                today
        );
    }

    public Optional<AssignmentCancelFollowupDto> findById(long id) {
        var rows = jdbc.query(
                SELECT_COLUMNS + " WHERE f.id = ?",
                (rs, rowNum) -> mapRow(rs),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public long insert(
            long employeeId,
            Long assignmentId,
            Long projectId,
            String cancelReason,
            Long assignedTo,
            String dueDate,
            String notes,
            Long createdBy,
            String now
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    """
                    INSERT INTO assignment_cancel_followup (
                        employee_id, assignment_id, project_id, cancel_reason,
                        status, assigned_to, due_date, notes, created_by, created_at
                    ) VALUES (?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?)
                    """,
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setLong(1, employeeId);
            setNullableLong(ps, 2, assignmentId);
            setNullableLong(ps, 3, projectId);
            ps.setString(4, cancelReason);
            setNullableLong(ps, 5, assignedTo);
            ps.setString(6, dueDate);
            ps.setString(7, notes);
            setNullableLong(ps, 8, createdBy);
            ps.setString(9, now);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("配属取消フォローの作成に失敗しました");
        }
        return key.longValue();
    }

    public void resolve(long id, String status, String notes, Long resolvedBy, String now) {
        jdbc.update(
                """
                UPDATE assignment_cancel_followup
                SET status = ?, notes = COALESCE(?, notes), resolved_at = ?, resolved_by = ?
                WHERE id = ?
                """,
                status,
                notes,
                now,
                resolvedBy,
                id
        );
    }

    private static void appendStatusFilter(StringBuilder sql, ArrayList<Object> params, String status) {
        if (status != null && !status.isBlank()) {
            sql.append(" AND f.status = ?");
            params.add(status.trim());
        }
    }

    private static AssignmentCancelFollowupDto mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        String dueDate = rs.getString("due_date");
        boolean overdue = false;
        if (dueDate != null && !dueDate.isBlank()) {
            try {
                overdue = LocalDate.parse(dueDate).isBefore(LocalDate.now());
            } catch (Exception ignored) {
                overdue = false;
            }
        }
        return new AssignmentCancelFollowupDto(
                rs.getLong("id"),
                rs.getLong("employee_id"),
                rs.getString("employee_code"),
                rs.getString("employee_name"),
                readNullableLong(rs, "assignment_id"),
                readNullableLong(rs, "project_id"),
                rs.getString("project_name"),
                rs.getString("client_name"),
                rs.getString("cancel_reason"),
                rs.getString("status"),
                readNullableLong(rs, "assigned_to"),
                rs.getString("assigned_to_display_name"),
                dueDate,
                rs.getString("notes"),
                readNullableLong(rs, "created_by"),
                rs.getString("created_by_display_name"),
                rs.getString("created_at"),
                rs.getString("resolved_at"),
                readNullableLong(rs, "resolved_by"),
                rs.getString("resolved_by_display_name"),
                overdue
        );
    }

    private static Long readNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private static void setNullableLong(PreparedStatement ps, int index, Long value) throws java.sql.SQLException {
        if (value != null) {
            ps.setLong(index, value);
        } else {
            ps.setNull(index, java.sql.Types.INTEGER);
        }
    }

    public record OverdueFollowupRow(
            long id,
            long employeeId,
            String employeeName,
            Long projectId,
            String projectName,
            String clientName,
            String dueDate,
            String notes,
            Long assignedTo
    ) {
    }
}
