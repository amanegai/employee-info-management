package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.dto.BpHelpReferralDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.List;
import java.util.Optional;

@Repository
public class BpHelpReferralRepository {

    private static final String SELECT_SQL = """
            SELECT r.id, r.project_id, r.candidate_name, r.bp_company_name, r.resume_file_id,
                   f.original_name AS resume_file_name, f.content_type AS resume_content_type,
                   f.size_bytes AS resume_size_bytes, r.note, r.status,
                   r.submitted_by, submitter.display_name AS submitted_by_name, r.submitted_at,
                   r.reviewed_by, reviewer.display_name AS reviewed_by_name, r.reviewed_at, r.review_note,
                   r.submitted_to_client_by, client_actor.display_name AS submitted_to_client_by_name,
                   r.submitted_to_client_at, r.interview_at, r.close_reason,
                   r.hired_employee_id, emp.employee_code AS hired_employee_code, emp.name AS hired_employee_name,
                   r.hired_at, r.hired_by, hirer.display_name AS hired_by_name,
                   r.created_at, r.updated_at
            FROM bp_help_referral r
            LEFT JOIN file_attachment f ON f.id = r.resume_file_id
            LEFT JOIN auth_user submitter ON submitter.id = r.submitted_by
            LEFT JOIN auth_user reviewer ON reviewer.id = r.reviewed_by
            LEFT JOIN auth_user client_actor ON client_actor.id = r.submitted_to_client_by
            LEFT JOIN auth_user hirer ON hirer.id = r.hired_by
            LEFT JOIN employee emp ON emp.id = r.hired_employee_id
            """;

    private final JdbcTemplate jdbc;

    public BpHelpReferralRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long insert(
            long projectId,
            String candidateName,
            String bpCompanyName,
            long resumeFileId,
            String note,
            String status,
            long submittedBy,
            String submittedAt
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    """
                    INSERT INTO bp_help_referral (
                        project_id, candidate_name, bp_company_name, resume_file_id, note, status,
                        submitted_by, submitted_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setLong(1, projectId);
            ps.setString(2, candidateName);
            ps.setString(3, bpCompanyName);
            ps.setLong(4, resumeFileId);
            ps.setString(5, note);
            ps.setString(6, status);
            ps.setLong(7, submittedBy);
            ps.setString(8, submittedAt);
            ps.setString(9, submittedAt);
            ps.setString(10, submittedAt);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "臨時候補の登録に失敗しました");
    }

    public List<BpHelpReferralDto> findByProjectId(long projectId) {
        return jdbc.query(
                SELECT_SQL + """
                WHERE r.project_id = ?
                ORDER BY r.submitted_at DESC, r.id DESC
                """,
                (rs, rowNum) -> mapRow(rs),
                projectId
        );
    }

    public Optional<BpHelpReferralDto> findById(long id) {
        var rows = jdbc.query(
                SELECT_SQL + " WHERE r.id = ?",
                (rs, rowNum) -> mapRow(rs),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public boolean updateStatus(
            long id,
            String fromStatus,
            String toStatus,
            Long reviewedBy,
            String reviewedAt,
            String reviewNote,
            Long submittedToClientBy,
            String submittedToClientAt,
            String updatedAt
    ) {
        return jdbc.update(
                """
                UPDATE bp_help_referral
                SET status = ?,
                    reviewed_by = COALESCE(?, reviewed_by),
                    reviewed_at = COALESCE(?, reviewed_at),
                    review_note = COALESCE(?, review_note),
                    submitted_to_client_by = COALESCE(?, submitted_to_client_by),
                    submitted_to_client_at = COALESCE(?, submitted_to_client_at),
                    updated_at = ?
                WHERE id = ? AND status = ?
                """,
                toStatus,
                reviewedBy,
                reviewedAt,
                reviewNote,
                submittedToClientBy,
                submittedToClientAt,
                updatedAt,
                id,
                fromStatus
        ) > 0;
    }

    public boolean advanceAfterClientSubmit(
            long id,
            String fromStatus,
            String toStatus,
            String interviewAt,
            String closeReason,
            String updatedAt
    ) {
        return jdbc.update(
                """
                UPDATE bp_help_referral
                SET status = ?,
                    interview_at = COALESCE(?, interview_at),
                    close_reason = COALESCE(?, close_reason),
                    updated_at = ?
                WHERE id = ? AND status = ?
                """,
                toStatus,
                interviewAt,
                closeReason,
                updatedAt,
                id,
                fromStatus
        ) > 0;
    }

    public boolean markHired(
            long id,
            String fromStatus,
            long employeeId,
            long hiredBy,
            String hiredAt,
            String closeReason
    ) {
        return jdbc.update(
                """
                UPDATE bp_help_referral
                SET status = 'HIRED',
                    hired_employee_id = ?,
                    hired_by = ?,
                    hired_at = ?,
                    close_reason = COALESCE(?, close_reason),
                    updated_at = ?
                WHERE id = ? AND status = ?
                """,
                employeeId,
                hiredBy,
                hiredAt,
                closeReason,
                hiredAt,
                id,
                fromStatus
        ) > 0;
    }

    public int countPendingByProjectId(long projectId) {
        Integer count = jdbc.queryForObject(
                """
                SELECT COUNT(*)
                FROM bp_help_referral
                WHERE project_id = ? AND status = 'PENDING'
                """,
                Integer.class,
                projectId
        );
        return count == null ? 0 : count;
    }

    private static BpHelpReferralDto mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        Long size = rs.getObject("resume_size_bytes") != null ? rs.getLong("resume_size_bytes") : null;
        return new BpHelpReferralDto(
                rs.getLong("id"),
                rs.getLong("project_id"),
                rs.getString("candidate_name"),
                rs.getString("bp_company_name"),
                rs.getLong("resume_file_id"),
                rs.getString("resume_file_name"),
                rs.getString("resume_content_type"),
                size,
                rs.getString("note"),
                rs.getString("status"),
                rs.getObject("submitted_by") != null ? rs.getLong("submitted_by") : null,
                rs.getString("submitted_by_name"),
                rs.getString("submitted_at"),
                rs.getObject("reviewed_by") != null ? rs.getLong("reviewed_by") : null,
                rs.getString("reviewed_by_name"),
                rs.getString("reviewed_at"),
                rs.getString("review_note"),
                rs.getObject("submitted_to_client_by") != null ? rs.getLong("submitted_to_client_by") : null,
                rs.getString("submitted_to_client_by_name"),
                rs.getString("submitted_to_client_at"),
                rs.getString("interview_at"),
                rs.getString("close_reason"),
                rs.getObject("hired_employee_id") != null ? rs.getLong("hired_employee_id") : null,
                rs.getString("hired_employee_code"),
                rs.getString("hired_employee_name"),
                rs.getString("hired_at"),
                rs.getObject("hired_by") != null ? rs.getLong("hired_by") : null,
                rs.getString("hired_by_name"),
                rs.getString("created_at"),
                rs.getString("updated_at")
        );
    }
}
