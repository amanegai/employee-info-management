package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.dto.ProjectCandidateDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class ProjectCandidateRepository {

    private static final String CANDIDATE_SELECT = """
            SELECT c.id, c.project_id, c.employee_id, e.employee_code, e.name AS employee_name,
                   d.name AS department_name, e.work_status, c.stage, c.match_score, c.matched_skills,
                   c.proposed_at, c.interview_at, c.confirmed_at, c.closed_at, c.close_reason,
                   c.notes, c.created_at, c.updated_at
            FROM project_candidate c
            JOIN employee e ON e.id = c.employee_id
            LEFT JOIN department d ON d.id = e.department_id
            """;

    private final JdbcTemplate jdbc;

    public ProjectCandidateRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ProjectCandidateDto> findByProjectId(long projectId) {
        return jdbc.query(
                CANDIDATE_SELECT + " WHERE c.project_id = ? ORDER BY c.stage, c.match_score DESC, e.employee_code",
                (rs, rowNum) -> mapRow(rs),
                projectId
        );
    }

    public List<ProjectCandidateDto> findByEmployeeId(long employeeId) {
        return jdbc.query(
                """
                SELECT c.id, c.project_id, c.employee_id, e.employee_code, e.name AS employee_name,
                       d.name AS department_name, e.work_status, c.stage, c.match_score, c.matched_skills,
                       c.proposed_at, c.interview_at, c.confirmed_at, c.closed_at, c.close_reason,
                       c.notes, c.created_at, c.updated_at, p.project_name, p.client_name
                FROM project_candidate c
                JOIN employee e ON e.id = c.employee_id
                LEFT JOIN department d ON d.id = e.department_id
                JOIN dispatch_project p ON p.id = c.project_id
                WHERE c.employee_id = ?
                ORDER BY c.updated_at DESC
                """,
                (rs, rowNum) -> mapRowWithProject(rs),
                employeeId
        );
    }

    public Optional<CandidateRow> findRowById(long id) {
        var rows = jdbc.query(
                """
                SELECT c.id, c.project_id, c.employee_id, c.stage, c.match_score, c.matched_skills,
                       e.name AS employee_name, e.work_status
                FROM project_candidate c
                JOIN employee e ON e.id = c.employee_id
                WHERE c.id = ?
                """,
                (rs, rowNum) -> new CandidateRow(
                        rs.getLong("id"),
                        rs.getLong("project_id"),
                        rs.getLong("employee_id"),
                        rs.getString("stage"),
                        rs.getObject("match_score") != null ? rs.getInt("match_score") : null,
                        rs.getString("matched_skills"),
                        rs.getString("employee_name"),
                        rs.getString("work_status")
                ),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public boolean existsInProject(long projectId, long employeeId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM project_candidate WHERE project_id = ? AND employee_id = ?",
                Long.class,
                projectId,
                employeeId
        );
        return count != null && count > 0;
    }

    public Map<Long, Integer> countActiveByEmployeeIds(List<Long> employeeIds) {
        Map<Long, Integer> result = new HashMap<>();
        if (employeeIds.isEmpty()) {
            return result;
        }
        String placeholders = String.join(",", employeeIds.stream().map(id -> "?").toList());
        jdbc.query(
                """
                SELECT employee_id, COUNT(*) AS cnt
                FROM project_candidate
                WHERE employee_id IN (%s)
                  AND stage IN ('MATCHED', 'PROPOSED', 'INTERVIEW_SCHEDULED', 'INTERVIEWING', 'OFFERED')
                GROUP BY employee_id
                """.formatted(placeholders),
                (rs, rowNum) -> {
                    result.put(rs.getLong("employee_id"), rs.getInt("cnt"));
                    return null;
                },
                employeeIds.toArray()
        );
        return result;
    }

    public Map<Long, Boolean> findAddedToProject(long projectId, List<Long> employeeIds) {
        Map<Long, Boolean> result = new HashMap<>();
        if (employeeIds.isEmpty() || projectId <= 0) {
            return result;
        }
        String placeholders = String.join(",", employeeIds.stream().map(id -> "?").toList());
        var params = new ArrayList<Object>();
        params.add(projectId);
        params.addAll(employeeIds);
        jdbc.query(
                """
                SELECT employee_id
                FROM project_candidate
                WHERE project_id = ? AND employee_id IN (%s)
                """.formatted(placeholders),
                (rs, rowNum) -> {
                    result.put(rs.getLong("employee_id"), true);
                    return null;
                },
                params.toArray()
        );
        return result;
    }

    public long insert(
            long projectId,
            long employeeId,
            Integer matchScore,
            String matchedSkillsJson,
            String notes,
            Long createdBy,
            String now
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    """
                    INSERT INTO project_candidate (
                        project_id, employee_id, stage, match_score, matched_skills,
                        notes, created_by, created_at, updated_at
                    ) VALUES (?, ?, 'MATCHED', ?, ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setLong(1, projectId);
            ps.setLong(2, employeeId);
            if (matchScore != null) {
                ps.setInt(3, matchScore);
            } else {
                ps.setNull(3, java.sql.Types.INTEGER);
            }
            ps.setString(4, matchedSkillsJson);
            ps.setString(5, notes);
            if (createdBy != null) {
                ps.setLong(6, createdBy);
            } else {
                ps.setNull(6, java.sql.Types.INTEGER);
            }
            ps.setString(7, now);
            ps.setString(8, now);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "候補の追加に失敗しました");
    }

    public void updateStage(long id, String stage, String notes, String interviewAt, String now) {
        String proposedAt = "PROPOSED".equals(stage) ? now : null;
        jdbc.update(
                """
                UPDATE project_candidate
                SET stage = ?,
                    notes = COALESCE(?, notes),
                    interview_at = COALESCE(?, interview_at),
                    proposed_at = CASE WHEN ? = 'PROPOSED' AND proposed_at IS NULL THEN ? ELSE proposed_at END,
                    updated_at = ?
                WHERE id = ?
                """,
                stage,
                notes,
                interviewAt,
                stage,
                proposedAt,
                now,
                id
        );
    }

    public void markConfirmed(long id, String now) {
        jdbc.update(
                """
                UPDATE project_candidate
                SET stage = 'CONFIRMED', confirmed_at = ?, updated_at = ?
                WHERE id = ?
                """,
                now,
                now,
                id
        );
    }

    public void markClosed(long id, String stage, String closeReason, String now) {
        jdbc.update(
                """
                UPDATE project_candidate
                SET stage = ?, close_reason = ?, closed_at = ?, updated_at = ?
                WHERE id = ?
                """,
                stage,
                closeReason,
                now,
                now,
                id
        );
    }

    public int markLostForEmployeeExcept(long employeeId, long exceptCandidateId, String now) {
        return jdbc.update(
                """
                UPDATE project_candidate
                SET stage = 'LOST', close_reason = 'OTHER_CANDIDATE_CONFIRMED',
                    closed_at = ?, updated_at = ?
                WHERE employee_id = ?
                  AND id != ?
                  AND stage IN ('MATCHED', 'PROPOSED', 'INTERVIEW_SCHEDULED', 'INTERVIEWING', 'OFFERED')
                """,
                now,
                now,
                employeeId,
                exceptCandidateId
        );
    }

    private static ProjectCandidateDto mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ProjectCandidateDto(
                rs.getLong("id"),
                rs.getLong("project_id"),
                rs.getLong("employee_id"),
                rs.getString("employee_code"),
                rs.getString("employee_name"),
                rs.getString("department_name"),
                rs.getString("work_status"),
                rs.getString("stage"),
                rs.getObject("match_score") != null ? rs.getInt("match_score") : null,
                parseSkillsJson(rs.getString("matched_skills")),
                rs.getString("proposed_at"),
                rs.getString("interview_at"),
                rs.getString("confirmed_at"),
                rs.getString("closed_at"),
                rs.getString("close_reason"),
                rs.getString("notes"),
                rs.getString("created_at"),
                rs.getString("updated_at"),
                null,
                null
        );
    }

    private static ProjectCandidateDto mapRowWithProject(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ProjectCandidateDto(
                rs.getLong("id"),
                rs.getLong("project_id"),
                rs.getLong("employee_id"),
                rs.getString("employee_code"),
                rs.getString("employee_name"),
                rs.getString("department_name"),
                rs.getString("work_status"),
                rs.getString("stage"),
                rs.getObject("match_score") != null ? rs.getInt("match_score") : null,
                parseSkillsJson(rs.getString("matched_skills")),
                rs.getString("proposed_at"),
                rs.getString("interview_at"),
                rs.getString("confirmed_at"),
                rs.getString("closed_at"),
                rs.getString("close_reason"),
                rs.getString("notes"),
                rs.getString("created_at"),
                rs.getString("updated_at"),
                rs.getString("project_name"),
                rs.getString("client_name")
        );
    }

    private static List<String> parseSkillsJson(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        String trimmed = json.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            trimmed = trimmed.substring(1, trimmed.length() - 1).trim();
            if (trimmed.isEmpty()) {
                return List.of();
            }
            return java.util.Arrays.stream(trimmed.split(","))
                    .map(value -> value.trim().replaceAll("^\"|\"$", ""))
                    .filter(value -> !value.isBlank())
                    .toList();
        }
        return List.of(trimmed);
    }

    public record CandidateRow(
            long id,
            long projectId,
            long employeeId,
            String stage,
            Integer matchScore,
            String matchedSkills,
            String employeeName,
            String workStatus
    ) {
    }
}
