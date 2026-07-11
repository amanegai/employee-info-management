package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.dto.DispatchProjectDto;
import jp.dispatch.employee.config.DatabaseDialect;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class DispatchProjectRepository {

    private final JdbcTemplate jdbc;
    private final DatabaseDialect dialect;

    public DispatchProjectRepository(JdbcTemplate jdbc, DatabaseDialect dialect) {
        this.jdbc = jdbc;
        this.dialect = dialect;
    }

    public List<DispatchProjectDto> search(String keyword, String status) {
        var sql = new StringBuilder("""
                SELECT p.id, p.client_id, p.client_name, p.project_name, p.project_text, p.required_skills,
                       p.optional_skills, p.billing_unit_price, p.billing_price_label,
                       p.work_location, p.expected_start_date, p.expected_end_date,
                       p.headcount_required, p.headcount_filled, p.headcount_unlimited, p.project_role, p.interview_rounds, p.status,
                       p.owner_user_id, au.display_name AS owner_display_name, p.notes, p.period_notes,
                       p.created_at, p.updated_at
                FROM dispatch_project p
                LEFT JOIN auth_user au ON au.id = p.owner_user_id
                WHERE 1=1
                """);
        var params = new ArrayList<Object>();
        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + keyword.trim() + "%";
            sql.append("""
                     AND (
                         """);
            sql.append(dialect.likeIgnoreCase("p.client_name"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("p.project_name"));
            sql.append("""
                     )
                    """);
            params.add(pattern);
            params.add(pattern);
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND p.status = ?");
            params.add(status.trim());
        }
        sql.append(" ORDER BY p.updated_at DESC, p.id DESC");
        return jdbc.query(sql.toString(), (rs, rowNum) -> mapProjectRow(rs), params.toArray());
    }

    public List<DispatchProjectDto> findByClient(long clientId, String clientName) {
        return jdbc.query(
                """
                SELECT p.id, p.client_id, p.client_name, p.project_name, p.project_text, p.required_skills,
                       p.optional_skills, p.billing_unit_price, p.billing_price_label,
                       p.work_location, p.expected_start_date, p.expected_end_date,
                       p.headcount_required, p.headcount_filled, p.headcount_unlimited, p.project_role, p.interview_rounds, p.status,
                       p.owner_user_id, au.display_name AS owner_display_name, p.notes, p.period_notes,
                       p.created_at, p.updated_at
                FROM dispatch_project p
                LEFT JOIN auth_user au ON au.id = p.owner_user_id
                WHERE p.client_id = ?
                   OR LOWER(TRIM(p.client_name)) = LOWER(TRIM(?))
                ORDER BY p.updated_at DESC, p.id DESC
                """,
                (rs, rowNum) -> mapProjectRow(rs),
                clientId,
                clientName
        );
    }

    public Optional<DispatchProjectDto> findById(long id) {
        var rows = jdbc.query(
                """
                SELECT p.id, p.client_id, p.client_name, p.project_name, p.project_text, p.required_skills,
                       p.optional_skills, p.billing_unit_price, p.billing_price_label,
                       p.work_location, p.expected_start_date, p.expected_end_date,
                       p.headcount_required, p.headcount_filled, p.headcount_unlimited, p.project_role, p.interview_rounds, p.status,
                       p.owner_user_id, au.display_name AS owner_display_name, p.notes, p.period_notes,
                       p.created_at, p.updated_at
                FROM dispatch_project p
                LEFT JOIN auth_user au ON au.id = p.owner_user_id
                WHERE p.id = ?
                """,
                (rs, rowNum) -> mapProjectRow(rs),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public Optional<Long> findIdByClientNameAndProjectName(String clientName, String projectName) {
        if (projectName == null || projectName.isBlank()) {
            return Optional.empty();
        }
        String normalizedClient = clientName == null ? "" : clientName.trim();
        var rows = jdbc.query(
                """
                SELECT id
                FROM dispatch_project
                WHERE LOWER(TRIM(project_name)) = LOWER(TRIM(?))
                  AND LOWER(TRIM(client_name)) = LOWER(TRIM(?))
                ORDER BY updated_at DESC, id DESC
                LIMIT 1
                """,
                (rs, rowNum) -> rs.getLong("id"),
                projectName.trim(),
                normalizedClient
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public Optional<Long> findIdByExactProjectName(String projectName) {
        if (projectName == null || projectName.isBlank()) {
            return Optional.empty();
        }
        var rows = jdbc.query(
                """
                SELECT id
                FROM dispatch_project
                WHERE LOWER(TRIM(project_name)) = LOWER(TRIM(?))
                ORDER BY updated_at DESC, id DESC
                LIMIT 1
                """,
                (rs, rowNum) -> rs.getLong("id"),
                projectName.trim()
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public Optional<ProjectHeaderRow> findHeaderById(long id) {
        var rows = jdbc.query(
                """
                SELECT id, client_name, project_name, headcount_required, headcount_filled, headcount_unlimited, status
                FROM dispatch_project
                WHERE id = ?
                """,
                (rs, rowNum) -> new ProjectHeaderRow(
                        rs.getLong("id"),
                        rs.getString("client_name"),
                        rs.getString("project_name"),
                        rs.getInt("headcount_required"),
                        rs.getInt("headcount_filled"),
                        rs.getBoolean("headcount_unlimited"),
                        rs.getString("status")
                ),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public long insert(
            Long clientId,
            String clientName,
            String projectName,
            String projectText,
            String requiredSkills,
            String optionalSkills,
            Integer billingUnitPrice,
            String billingPriceLabel,
            String workLocation,
            String expectedStartDate,
            String expectedEndDate,
            int headcountRequired,
            boolean headcountUnlimited,
            String projectRole,
            String interviewRounds,
            Long ownerUserId,
            String notes,
            String periodNotes,
            String now
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    """
                    INSERT INTO dispatch_project (
                        client_id, client_name, project_name, project_text, required_skills, optional_skills,
                        billing_unit_price, billing_price_label, work_location,
                        expected_start_date, expected_end_date, headcount_required, headcount_filled, headcount_unlimited,
                        project_role, interview_rounds, status, owner_user_id, notes, period_notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            if (clientId != null) {
                ps.setLong(1, clientId);
            } else {
                ps.setNull(1, java.sql.Types.BIGINT);
            }
            ps.setString(2, clientName);
            ps.setString(3, projectName);
            ps.setString(4, projectText);
            ps.setString(5, requiredSkills);
            ps.setString(6, optionalSkills);
            if (billingUnitPrice != null) {
                ps.setInt(7, billingUnitPrice);
            } else {
                ps.setNull(7, java.sql.Types.INTEGER);
            }
            ps.setString(8, billingPriceLabel);
            ps.setString(9, workLocation);
            ps.setString(10, expectedStartDate);
            ps.setString(11, expectedEndDate);
            ps.setInt(12, headcountRequired);
            ps.setBoolean(13, headcountUnlimited);
            ps.setString(14, projectRole);
            ps.setString(15, interviewRounds);
            if (ownerUserId != null) {
                ps.setLong(16, ownerUserId);
            } else {
                ps.setNull(16, java.sql.Types.INTEGER);
            }
            ps.setString(17, notes);
            ps.setString(18, periodNotes);
            ps.setString(19, now);
            ps.setString(20, now);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "案件の作成に失敗しました");
    }

    public void update(
            long id,
            Long clientId,
            String clientName,
            String projectName,
            String projectText,
            String requiredSkills,
            String optionalSkills,
            Integer billingUnitPrice,
            String billingPriceLabel,
            String workLocation,
            String expectedStartDate,
            String expectedEndDate,
            int headcountRequired,
            boolean headcountUnlimited,
            String projectRole,
            String interviewRounds,
            Long ownerUserId,
            String notes,
            String periodNotes,
            String now
    ) {
        jdbc.update(
                """
                UPDATE dispatch_project
                SET client_id = ?, client_name = ?, project_name = ?, project_text = ?, required_skills = ?,
                    optional_skills = ?, billing_unit_price = ?, billing_price_label = ?,
                    work_location = ?, expected_start_date = ?, expected_end_date = ?,
                    headcount_required = ?, headcount_unlimited = ?, project_role = ?, interview_rounds = ?, owner_user_id = ?, notes = ?, period_notes = ?, updated_at = ?
                WHERE id = ?
                """,
                clientId,
                clientName,
                projectName,
                projectText,
                requiredSkills,
                optionalSkills,
                billingUnitPrice,
                billingPriceLabel,
                workLocation,
                expectedStartDate,
                expectedEndDate,
                headcountRequired,
                headcountUnlimited,
                projectRole,
                interviewRounds,
                ownerUserId,
                notes,
                periodNotes,
                now,
                id
        );
    }

    public void updateStatus(long id, String status, String notes, String now) {
        jdbc.update(
                """
                UPDATE dispatch_project
                SET status = ?, notes = COALESCE(?, notes), updated_at = ?
                WHERE id = ?
                """,
                status,
                notes,
                now,
                id
        );
    }

    public boolean deleteById(long id) {
        return jdbc.update("DELETE FROM dispatch_project WHERE id = ?", id) > 0;
    }

    public void incrementHeadcountFilled(long id, String now) {
        jdbc.update(
                """
                UPDATE dispatch_project
                SET headcount_filled = headcount_filled + 1,
                    status = CASE
                        WHEN headcount_unlimited THEN status
                        WHEN headcount_filled + 1 >= headcount_required THEN 'FILLED'
                        ELSE 'PARTIALLY_FILLED'
                    END,
                    updated_at = ?
                WHERE id = ?
                """,
                now,
                id
        );
    }

    public void decrementHeadcountFilled(long id, String now) {
        jdbc.update(
                """
                UPDATE dispatch_project
                SET headcount_filled = CASE WHEN headcount_filled > 0 THEN headcount_filled - 1 ELSE 0 END,
                    status = CASE
                        WHEN headcount_unlimited THEN status
                        WHEN headcount_filled - 1 <= 0 THEN 'OPEN'
                        WHEN headcount_filled - 1 < headcount_required THEN 'PARTIALLY_FILLED'
                        ELSE status
                    END,
                    updated_at = ?
                WHERE id = ?
                """,
                now,
                id
        );
    }

    private static DispatchProjectDto mapProjectRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new DispatchProjectDto(
                rs.getLong("id"),
                readNullableLong(rs, "client_id"),
                rs.getString("client_name"),
                rs.getString("project_name"),
                rs.getString("project_text"),
                rs.getString("required_skills"),
                rs.getString("optional_skills"),
                readNullableInteger(rs, "billing_unit_price"),
                rs.getString("billing_price_label"),
                rs.getString("work_location"),
                rs.getString("expected_start_date"),
                rs.getString("expected_end_date"),
                rs.getInt("headcount_required"),
                rs.getInt("headcount_filled"),
                rs.getBoolean("headcount_unlimited"),
                rs.getString("project_role"),
                rs.getString("interview_rounds"),
                rs.getString("status"),
                readNullableLong(rs, "owner_user_id"),
                rs.getString("owner_display_name"),
                rs.getString("notes"),
                rs.getString("period_notes"),
                rs.getString("created_at"),
                rs.getString("updated_at"),
                List.of()
        );
    }

    private static Long readNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private static Integer readNullableInteger(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        int value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    public record ProjectHeaderRow(
            long id,
            String clientName,
            String projectName,
            int headcountRequired,
            int headcountFilled,
            boolean headcountUnlimited,
            String status
    ) {
    }
}
