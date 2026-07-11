package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.dto.HrOpsRequestDto;
import jp.dispatch.employee.dto.HrOpsRequestSaveRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class HrOpsRequestRepository {

    private static final String SELECT_BASE = """
            SELECT r.id, r.request_type, r.title, r.description,
                   r.employee_id, e.name AS employee_name, e.employee_code,
                   r.requester_id, req.display_name AS requester_name,
                   r.status, r.assigned_to, asn.display_name AS assignee_name,
                   r.due_date, r.hr_notes, r.reject_reason,
                   r.created_at, r.updated_at, r.submitted_at, r.resolved_at,
                   r.resolved_by, res.display_name AS resolver_name
            FROM hr_ops_request r
            JOIN auth_user req ON req.id = r.requester_id
            LEFT JOIN employee e ON e.id = r.employee_id
            LEFT JOIN auth_user asn ON asn.id = r.assigned_to
            LEFT JOIN auth_user res ON res.id = r.resolved_by
            """;

    private final JdbcTemplate jdbc;

    public HrOpsRequestRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<HrOpsRequestDto> findVisible(String status, String requestType, Long requesterId, boolean hrManager) {
        var sql = new StringBuilder(SELECT_BASE).append(" WHERE 1=1 ");
        var params = new ArrayList<Object>();
        if (!hrManager && requesterId != null) {
            sql.append(" AND r.requester_id = ? ");
            params.add(requesterId);
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND r.status = ? ");
            params.add(status.trim());
        }
        if (requestType != null && !requestType.isBlank()) {
            sql.append(" AND r.request_type = ? ");
            params.add(requestType.trim());
        }
        sql.append(" ORDER BY r.updated_at DESC, r.id DESC ");
        return jdbc.query(sql.toString(), this::mapRow, params.toArray());
    }

    public long countPendingForHr() {
        Long count = jdbc.queryForObject(
                """
                SELECT COUNT(*)::bigint
                FROM hr_ops_request
                WHERE status IN ('SUBMITTED', 'IN_PROGRESS')
                """,
                Long.class
        );
        return count == null ? 0L : count;
    }

    public Optional<HrOpsRequestDto> findById(long id) {
        var rows = jdbc.query(SELECT_BASE + " WHERE r.id = ? ", this::mapRow, id);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public long insert(HrOpsRequestSaveRequest request, long requesterId, String now) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var ps = connection.prepareStatement(
                    """
                    INSERT INTO hr_ops_request (
                        request_type, title, description, employee_id, requester_id,
                        status, due_date, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setString(1, request.requestType());
            ps.setString(2, request.title());
            ps.setString(3, request.description());
            if (request.employeeId() == null) {
                ps.setNull(4, java.sql.Types.BIGINT);
            } else {
                ps.setLong(4, request.employeeId());
            }
            ps.setLong(5, requesterId);
            ps.setString(6, request.dueDate());
            ps.setString(7, now);
            ps.setString(8, now);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "申請の登録に失敗しました");
    }

    public void updateDraft(long id, HrOpsRequestSaveRequest request, String now) {
        jdbc.update(
                """
                UPDATE hr_ops_request
                SET request_type = ?, title = ?, description = ?, employee_id = ?,
                    due_date = ?, updated_at = ?
                WHERE id = ? AND status = 'DRAFT'
                """,
                request.requestType(),
                request.title(),
                request.description(),
                request.employeeId(),
                request.dueDate(),
                now,
                id
        );
    }

    public boolean submit(long id, String now) {
        int updated = jdbc.update(
                """
                UPDATE hr_ops_request
                SET status = 'SUBMITTED', submitted_at = ?, updated_at = ?
                WHERE id = ? AND status = 'DRAFT'
                """,
                now, now, id
        );
        return updated > 0;
    }

    public boolean start(long id, long assigneeId, String now) {
        int updated = jdbc.update(
                """
                UPDATE hr_ops_request
                SET status = 'IN_PROGRESS', assigned_to = ?, updated_at = ?
                WHERE id = ? AND status = 'SUBMITTED'
                """,
                assigneeId, now, id
        );
        return updated > 0;
    }

    public boolean complete(long id, long resolverId, String hrNotes, String now) {
        int updated = jdbc.update(
                """
                UPDATE hr_ops_request
                SET status = 'COMPLETED', hr_notes = ?, resolved_at = ?, resolved_by = ?,
                    assigned_to = COALESCE(assigned_to, ?), updated_at = ?
                WHERE id = ? AND status IN ('SUBMITTED', 'IN_PROGRESS')
                """,
                hrNotes, now, resolverId, resolverId, now, id
        );
        return updated > 0;
    }

    public boolean reject(long id, long resolverId, String rejectReason, String hrNotes, String now) {
        int updated = jdbc.update(
                """
                UPDATE hr_ops_request
                SET status = 'REJECTED', reject_reason = ?, hr_notes = ?,
                    resolved_at = ?, resolved_by = ?, updated_at = ?
                WHERE id = ? AND status IN ('SUBMITTED', 'IN_PROGRESS')
                """,
                rejectReason, hrNotes, now, resolverId, now, id
        );
        return updated > 0;
    }

    public boolean cancel(long id, String now) {
        int updated = jdbc.update(
                """
                UPDATE hr_ops_request
                SET status = 'CANCELLED', updated_at = ?
                WHERE id = ? AND status IN ('DRAFT', 'SUBMITTED')
                """,
                now, id
        );
        return updated > 0;
    }

    private HrOpsRequestDto mapRow(ResultSet rs, int rowNum) throws SQLException {
        long employeeId = rs.getLong("employee_id");
        Long employeeIdValue = rs.wasNull() ? null : employeeId;
        long assignedTo = rs.getLong("assigned_to");
        Long assignedToValue = rs.wasNull() ? null : assignedTo;
        long resolvedBy = rs.getLong("resolved_by");
        Long resolvedByValue = rs.wasNull() ? null : resolvedBy;
        return new HrOpsRequestDto(
                rs.getLong("id"),
                rs.getString("request_type"),
                rs.getString("title"),
                rs.getString("description"),
                employeeIdValue,
                rs.getString("employee_name"),
                rs.getString("employee_code"),
                rs.getLong("requester_id"),
                rs.getString("requester_name"),
                rs.getString("status"),
                assignedToValue,
                rs.getString("assignee_name"),
                rs.getString("due_date"),
                rs.getString("hr_notes"),
                rs.getString("reject_reason"),
                rs.getString("created_at"),
                rs.getString("updated_at"),
                rs.getString("submitted_at"),
                rs.getString("resolved_at"),
                resolvedByValue,
                rs.getString("resolver_name")
        );
    }
}
