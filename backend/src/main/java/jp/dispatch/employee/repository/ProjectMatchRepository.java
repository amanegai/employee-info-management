package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.DatabaseDialect;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class ProjectMatchRepository {

    private final JdbcTemplate jdbc;
    private final DatabaseDialect dialect;

    public ProjectMatchRepository(JdbcTemplate jdbc, DatabaseDialect dialect) {
        this.jdbc = jdbc;
        this.dialect = dialect;
    }

    public List<MatchCandidateRow> findCandidates(List<Long> scopeDepartmentIds) {
        var sql = new StringBuilder("""
                SELECT e.id, e.employee_code, e.name, d.name AS department_name, e.work_status, e.assignment_role,
                       e.end_date,
                       COALESCE(es.billing_unit_price, e.unit_price, 0) AS unit_price, e.evaluation,
                       p.japanese_level, p.english_level, p.it_industry_years,
                       p.specialty_dev, p.specialty_business, p.self_pr
                FROM employee e
                LEFT JOIN department d ON d.id = e.department_id
                LEFT JOIN employee_salary es ON es.employee_id = e.id
                LEFT JOIN employee_personal p ON p.employee_id = e.id
                WHERE (e.work_status IN ('待機中', '案件終了間近')
                       OR e.work_status IS NULL OR e.work_status = '')
                  AND NOT EXISTS (
                      SELECT 1 FROM employee_project_assignment a
                      WHERE a.employee_id = e.id
                        AND a.is_primary = 1
                        AND a.status = 'PLANNED'
                        """
                + "AND " + dialect.textDateAfterCurrentLocalDate("a.start_date")
                + """
                  )
                """);
        var params = new ArrayList<Object>();
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, "e");
        sql.append(" ORDER BY e.employee_code");
        return jdbc.query(sql.toString(), (rs, rowNum) -> new MatchCandidateRow(
                rs.getLong("id"),
                rs.getString("employee_code"),
                rs.getString("name"),
                rs.getString("department_name"),
                rs.getString("work_status"),
                rs.getString("assignment_role"),
                rs.getString("end_date"),
                rs.getInt("unit_price"),
                rs.getString("evaluation"),
                rs.getString("japanese_level"),
                rs.getString("english_level"),
                rs.getObject("it_industry_years") != null ? rs.getInt("it_industry_years") : null,
                rs.getString("specialty_dev"),
                rs.getString("specialty_business"),
                rs.getString("self_pr")
        ), params.toArray());
    }

    public Map<Long, List<String>> findSkillTokensByEmployeeIds(List<Long> employeeIds) {
        Map<Long, List<String>> result = new HashMap<>();
        if (employeeIds.isEmpty()) {
            return result;
        }
        String placeholders = String.join(",", employeeIds.stream().map(id -> "?").toList());
        var params = new ArrayList<Object>(employeeIds);

        jdbc.query(
                "SELECT employee_id, skill_name FROM employee_skill WHERE employee_id IN (" + placeholders + ")",
                rs -> {
                    result.computeIfAbsent(rs.getLong("employee_id"), id -> new ArrayList<>())
                            .add(rs.getString("skill_name"));
                },
                params.toArray()
        );

        jdbc.query(
                "SELECT employee_id, item_name, category FROM employee_technical_skill WHERE employee_id IN (" + placeholders + ")",
                rs -> {
                    result.computeIfAbsent(rs.getLong("employee_id"), id -> new ArrayList<>())
                            .add(rs.getString("item_name"));
                    result.get(rs.getLong("employee_id")).add(rs.getString("category"));
                },
                params.toArray()
        );

        jdbc.query(
                "SELECT employee_id, languages, fw_tools, role_overview FROM employee_career WHERE employee_id IN (" + placeholders + ")",
                rs -> {
                    long id = rs.getLong("employee_id");
                    List<String> tokens = result.computeIfAbsent(id, key -> new ArrayList<>());
                    addIfPresent(tokens, rs.getString("languages"));
                    addIfPresent(tokens, rs.getString("fw_tools"));
                    addIfPresent(tokens, rs.getString("role_overview"));
                },
                params.toArray()
        );

        return result;
    }

    private static void addIfPresent(List<String> tokens, String value) {
        if (value != null && !value.isBlank()) {
            tokens.add(value);
        }
    }

    public record MatchCandidateRow(
            long id,
            String employeeCode,
            String name,
            String departmentName,
            String workStatus,
            String assignmentRole,
            String endDate,
            int unitPrice,
            String evaluation,
            String japaneseLevel,
            String englishLevel,
            Integer itIndustryYears,
            String specialtyDev,
            String specialtyBusiness,
            String selfPr
    ) {
    }
}
