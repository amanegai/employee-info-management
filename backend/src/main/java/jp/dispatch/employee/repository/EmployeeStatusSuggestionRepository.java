package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.dto.EmployeeStatusSuggestionDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class EmployeeStatusSuggestionRepository {

    private final JdbcTemplate jdbc;

    public EmployeeStatusSuggestionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<EmployeeStatusSuggestionDto> findByStatus(String status) {
        var sql = new StringBuilder("""
                SELECT s.id, s.employee_id, e.employee_code, e.name AS employee_name,
                       e.work_status AS current_work_status, e.end_date AS current_end_date,
                       s.suggested_status, s.suggested_end_date, s.reason,
                       s.source_assignment_id, s.status, s.created_at
                FROM employee_status_suggestion s
                JOIN employee e ON e.id = s.employee_id
                WHERE 1=1
                """);
        var params = new ArrayList<Object>();
        if (status != null && !status.isBlank()) {
            sql.append(" AND s.status = ?");
            params.add(status.trim());
        }
        sql.append(" ORDER BY s.created_at DESC, s.id DESC");
        return jdbc.query(sql.toString(), (rs, rowNum) -> new EmployeeStatusSuggestionDto(
                rs.getLong("id"),
                rs.getLong("employee_id"),
                rs.getString("employee_code"),
                rs.getString("employee_name"),
                rs.getString("current_work_status"),
                rs.getString("current_end_date"),
                rs.getString("suggested_status"),
                rs.getString("suggested_end_date"),
                rs.getString("reason"),
                readNullableLong(rs, "source_assignment_id"),
                rs.getString("status"),
                rs.getString("created_at")
        ), params.toArray());
    }

    public boolean hasPendingDuplicate(long employeeId, String suggestedStatus, String reason) {
        Long count = jdbc.queryForObject(
                """
                SELECT COUNT(*)
                FROM employee_status_suggestion
                WHERE employee_id = ?
                  AND suggested_status = ?
                  AND reason = ?
                  AND status = 'PENDING'
                """,
                Long.class,
                employeeId,
                suggestedStatus,
                reason
        );
        return count != null && count > 0;
    }

    public long insertPending(
            long employeeId,
            String suggestedStatus,
            String suggestedEndDate,
            String reason,
            Long sourceAssignmentId,
            String now
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    """
                    INSERT INTO employee_status_suggestion (
                        employee_id, suggested_status, suggested_end_date, reason,
                        source_assignment_id, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setLong(1, employeeId);
            ps.setString(2, suggestedStatus);
            ps.setString(3, suggestedEndDate);
            ps.setString(4, reason);
            if (sourceAssignmentId != null) {
                ps.setLong(5, sourceAssignmentId);
            } else {
                ps.setNull(5, java.sql.Types.INTEGER);
            }
            ps.setString(6, now);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "状態提案の作成に失敗しました");
    }

    public Optional<EmployeeStatusSuggestionDto> findById(long id) {
        var list = findByStatus(null).stream().filter(item -> item.id() == id).toList();
        if (!list.isEmpty()) {
            return Optional.of(list.getFirst());
        }
        var rows = jdbc.query(
                """
                SELECT s.id, s.employee_id, e.employee_code, e.name AS employee_name,
                       e.work_status AS current_work_status, e.end_date AS current_end_date,
                       s.suggested_status, s.suggested_end_date, s.reason,
                       s.source_assignment_id, s.status, s.created_at
                FROM employee_status_suggestion s
                JOIN employee e ON e.id = s.employee_id
                WHERE s.id = ?
                """,
                (rs, rowNum) -> new EmployeeStatusSuggestionDto(
                        rs.getLong("id"),
                        rs.getLong("employee_id"),
                        rs.getString("employee_code"),
                        rs.getString("employee_name"),
                        rs.getString("current_work_status"),
                        rs.getString("current_end_date"),
                        rs.getString("suggested_status"),
                        rs.getString("suggested_end_date"),
                        rs.getString("reason"),
                        readNullableLong(rs, "source_assignment_id"),
                        rs.getString("status"),
                        rs.getString("created_at")
                ),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public void resolve(long id, String status, Long resolvedBy, String now) {
        jdbc.update(
                """
                UPDATE employee_status_suggestion
                SET status = ?, resolved_at = ?, resolved_by = ?
                WHERE id = ?
                """,
                status,
                now,
                resolvedBy,
                id
        );
    }

    private static Long readNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }
}
