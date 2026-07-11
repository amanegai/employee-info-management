package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.DatabaseDialect;
import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.dto.EmployeeProjectAssignmentDto;
import jp.dispatch.employee.dto.HrOpsClientActiveEmployeeDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.List;
import java.util.Optional;

@Repository
public class EmployeeProjectAssignmentRepository {

    private static final String SELECT_COLUMNS = """
            SELECT a.id, a.employee_id, a.project_id, a.candidate_id, a.client_name, a.project_name,
                   a.status, a.start_date, a.end_date, a.is_primary, a.notes, a.confirmed_at,
                   a.created_at, a.updated_at
            FROM employee_project_assignment a
            """;

    private final JdbcTemplate jdbc;
    private final DatabaseDialect dialect;

    public EmployeeProjectAssignmentRepository(JdbcTemplate jdbc, DatabaseDialect dialect) {
        this.jdbc = jdbc;
        this.dialect = dialect;
    }

    public boolean hasOpenPrimaryAssignment(long employeeId) {
        Long count = jdbc.queryForObject(
                """
                SELECT COUNT(*)
                FROM employee_project_assignment
                WHERE employee_id = ?
                  AND is_primary = 1
                  AND status IN ('PLANNED', 'ACTIVE')
                """,
                Long.class,
                employeeId
        );
        return count != null && count > 0;
    }

    public boolean hasFuturePlannedPrimary(long employeeId, String today) {
        Long count = jdbc.queryForObject(
                """
                SELECT COUNT(*)
                FROM employee_project_assignment
                WHERE employee_id = ?
                  AND is_primary = 1
                  AND status = 'PLANNED'
                  """
                + "AND " + dialect.textDateGreaterThanParam("start_date"),
                Long.class,
                employeeId,
                today
        );
        return count != null && count > 0;
    }

    public int countByProjectId(long projectId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM employee_project_assignment WHERE project_id = ?",
                Long.class,
                projectId
        );
        return count != null ? count.intValue() : 0;
    }

    public List<EmployeeProjectAssignmentDto> findByEmployeeId(long employeeId) {
        return jdbc.query(
                SELECT_COLUMNS + " WHERE a.employee_id = ? ORDER BY a.start_date DESC, a.id DESC",
                (rs, rowNum) -> mapRow(rs),
                employeeId
        );
    }

    public List<HrOpsClientActiveEmployeeDto> findActiveEmployeesByClientName(String clientName) {
        if (clientName == null || clientName.isBlank()) {
            return List.of();
        }
        return jdbc.query(
                """
                SELECT e.id AS employee_id, e.employee_code, e.name AS employee_name,
                       MIN(a.project_name) AS project_name
                FROM employee_project_assignment a
                JOIN employee e ON e.id = a.employee_id
                WHERE a.status = 'ACTIVE'
                  AND LOWER(TRIM(a.client_name)) = LOWER(TRIM(?))
                GROUP BY e.id, e.employee_code, e.name
                ORDER BY e.employee_code
                """,
                (rs, rowNum) -> new HrOpsClientActiveEmployeeDto(
                        rs.getLong("employee_id"),
                        rs.getString("employee_code"),
                        rs.getString("employee_name"),
                        rs.getString("project_name")
                ),
                clientName.trim()
        );
    }

    public Optional<AssignmentRow> findRowById(long id) {
        var rows = jdbc.query(
                SELECT_COLUMNS + " WHERE a.id = ?",
                (rs, rowNum) -> new AssignmentRow(
                        rs.getLong("id"),
                        rs.getLong("employee_id"),
                        rs.getLong("project_id"),
                        readNullableLong(rs, "candidate_id"),
                        rs.getString("client_name"),
                        rs.getString("project_name"),
                        rs.getString("status"),
                        rs.getString("start_date"),
                        rs.getString("end_date"),
                        rs.getInt("is_primary") == 1,
                        rs.getString("notes")
                ),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public Optional<EmployeeProjectAssignmentDto> findById(long id) {
        var rows = jdbc.query(
                SELECT_COLUMNS + " WHERE a.id = ?",
                (rs, rowNum) -> mapRow(rs),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public Optional<AssignmentRow> findPrimaryActive(long employeeId) {
        return findPrimaryByStatus(employeeId, "ACTIVE");
    }

    public Optional<AssignmentRow> findPrimaryPlanned(long employeeId) {
        return findPrimaryByStatus(employeeId, "PLANNED");
    }

    public Optional<AssignmentRow> findPrimaryPlannedDue(long employeeId, String today) {
        var rows = jdbc.query(
                SELECT_COLUMNS + """
                 WHERE a.employee_id = ?
                   AND a.is_primary = 1
                   AND a.status = 'PLANNED'
                   """
                + "AND " + dialect.textDateLessOrEqualParam("a.start_date")
                + """
                 ORDER BY a.start_date
                 LIMIT 1
                """,
                (rs, rowNum) -> mapAssignmentRow(rs),
                employeeId,
                today
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public List<AssignmentRow> findAllPrimaryPlannedDue(String today) {
        return jdbc.query(
                SELECT_COLUMNS + """
                 WHERE a.is_primary = 1
                   AND a.status = 'PLANNED'
                   """
                + "AND " + dialect.textDateLessOrEqualParam("a.start_date")
                + """
                 ORDER BY a.start_date, a.id
                """,
                (rs, rowNum) -> mapAssignmentRow(rs),
                today
        );
    }

    public long insertPlanned(
            long employeeId,
            long projectId,
            long candidateId,
            String clientName,
            String projectName,
            String startDate,
            String endDate,
            String notes,
            Long confirmedBy,
            String confirmedAt,
            String now
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    """
                    INSERT INTO employee_project_assignment (
                        employee_id, project_id, candidate_id, client_name, project_name,
                        status, start_date, end_date, is_primary, notes,
                        confirmed_by, confirmed_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'PLANNED', ?, ?, 1, ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setLong(1, employeeId);
            ps.setLong(2, projectId);
            ps.setLong(3, candidateId);
            ps.setString(4, clientName);
            ps.setString(5, projectName);
            ps.setString(6, startDate);
            ps.setString(7, endDate);
            ps.setString(8, notes);
            if (confirmedBy != null) {
                ps.setLong(9, confirmedBy);
            } else {
                ps.setNull(9, java.sql.Types.INTEGER);
            }
            ps.setString(10, confirmedAt);
            ps.setString(11, now);
            ps.setString(12, now);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "配属の作成に失敗しました");
    }

    public void updateDatesAndNotes(long id, String startDate, String endDate, String notes, String now) {
        jdbc.update(
                """
                UPDATE employee_project_assignment
                SET start_date = ?, end_date = ?, notes = COALESCE(?, notes), updated_at = ?
                WHERE id = ?
                """,
                startDate,
                endDate,
                notes,
                now,
                id
        );
    }

    public void updateEndDate(long id, String endDate, String now) {
        jdbc.update(
                "UPDATE employee_project_assignment SET end_date = ?, updated_at = ? WHERE id = ?",
                endDate,
                now,
                id
        );
    }

    public void activate(long id, String now) {
        jdbc.update(
                "UPDATE employee_project_assignment SET status = 'ACTIVE', updated_at = ? WHERE id = ?",
                now,
                id
        );
    }

    public void complete(long id, String now) {
        jdbc.update(
                "UPDATE employee_project_assignment SET status = 'COMPLETED', updated_at = ? WHERE id = ?",
                now,
                id
        );
    }

    public void cancel(long id, String now) {
        jdbc.update(
                "UPDATE employee_project_assignment SET status = 'CANCELLED', updated_at = ? WHERE id = ?",
                now,
                id
        );
    }

    private Optional<AssignmentRow> findPrimaryByStatus(long employeeId, String status) {
        var rows = jdbc.query(
                SELECT_COLUMNS + """
                 WHERE a.employee_id = ?
                   AND a.is_primary = 1
                   AND a.status = ?
                 ORDER BY a.start_date DESC
                 LIMIT 1
                """,
                (rs, rowNum) -> mapAssignmentRow(rs),
                employeeId,
                status
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    private static AssignmentRow mapAssignmentRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new AssignmentRow(
                rs.getLong("id"),
                rs.getLong("employee_id"),
                rs.getLong("project_id"),
                readNullableLong(rs, "candidate_id"),
                rs.getString("client_name"),
                rs.getString("project_name"),
                rs.getString("status"),
                rs.getString("start_date"),
                rs.getString("end_date"),
                rs.getInt("is_primary") == 1,
                rs.getString("notes")
        );
    }

    private static EmployeeProjectAssignmentDto mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new EmployeeProjectAssignmentDto(
                rs.getLong("id"),
                rs.getLong("employee_id"),
                rs.getLong("project_id"),
                readNullableLong(rs, "candidate_id"),
                rs.getString("client_name"),
                rs.getString("project_name"),
                rs.getString("status"),
                rs.getString("start_date"),
                rs.getString("end_date"),
                rs.getInt("is_primary") == 1,
                rs.getString("notes"),
                rs.getString("confirmed_at"),
                rs.getString("created_at"),
                rs.getString("updated_at")
        );
    }

    private static Long readNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    public record AssignmentRow(
            long id,
            long employeeId,
            long projectId,
            Long candidateId,
            String clientName,
            String projectName,
            String status,
            String startDate,
            String endDate,
            boolean primary,
            String notes
    ) {
    }
}
