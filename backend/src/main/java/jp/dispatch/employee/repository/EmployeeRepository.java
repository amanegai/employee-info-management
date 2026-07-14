package jp.dispatch.employee.repository;

import jp.dispatch.employee.dto.DepartmentDto;
import jp.dispatch.employee.dto.EmployeeDto;
import jp.dispatch.employee.dto.EmployeeRequest;
import jp.dispatch.employee.dto.NationalityDto;
import jp.dispatch.employee.dto.ResidenceStatusDto;
import jp.dispatch.employee.dto.SummaryDto;
import jp.dispatch.employee.config.DatabaseDialect;
import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.model.TechnicalSkillLevel;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Types;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class EmployeeRepository {

    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");

    private static final RowMapper<EmployeeDto> EMPLOYEE_MAPPER = (rs, rowNum) -> new EmployeeDto(
            rs.getLong("id"),
            rs.getString("employee_code"),
            rs.getString("name"),
            rs.getString("name_kana"),
            readNullableLong(rs, "department_id"),
            rs.getString("department_name"),
            rs.getString("position"),
            rs.getString("assignment_role"),
            rs.getString("employee_type"),
            rs.getString("work_status"),
            rs.getInt("unit_price"),
            rs.getString("evaluation"),
            rs.getString("end_date"),
            false
    );

    private final JdbcTemplate jdbc;
    private final DatabaseDialect dialect;

    public EmployeeRepository(JdbcTemplate jdbc, DatabaseDialect dialect) {
        this.jdbc = jdbc;
        this.dialect = dialect;
    }

    public SummaryDto fetchSummary(List<Long> scopeDepartmentIds) {
        YearMonth currentMonth = YearMonth.now(ZONE);
        String monthStart = currentMonth.atDay(1).toString();
        String monthEnd = currentMonth.atEndOfMonth().toString();
        String today = LocalDate.now(ZONE).toString();

        long active = countScoped("work_status != '退職'", scopeDepartmentIds);
        long working = countScoped("work_status = '稼働中'", scopeDepartmentIds);
        long standby = countScoped("work_status = '待機中'", scopeDepartmentIds);
        long endingThisMonth = countEndingThisMonth(monthStart, monthEnd, today, scopeDepartmentIds);

        return new SummaryDto(active, working, standby, endingThisMonth);
    }

    private long countEndingThisMonth(
            String monthStart,
            String monthEnd,
            String today,
            List<Long> scopeDepartmentIds
    ) {
        var sql = new StringBuilder("""
                SELECT COUNT(DISTINCT e.id) FROM employee e
                WHERE e.work_status NOT IN ('退職', '休業')
                """);
        var params = new ArrayList<Object>();
        appendEndingThisMonthConditions(sql, params, "e.id", monthStart, monthEnd, today);
        appendDepartmentScopeClause(sql, params, scopeDepartmentIds, "e");
        Long result = jdbc.queryForObject(sql.toString(), Long.class, params.toArray());
        return result != null ? result : 0L;
    }

    private void appendEndingThisMonthConditions(
            StringBuilder sql,
            List<Object> params,
            String employeeIdColumn,
            String monthStart,
            String monthEnd,
            String today
    ) {
        sql.append("""
                 AND EXISTS (
                     SELECT 1 FROM employee_project_assignment a
                     WHERE a.employee_id = """).append(employeeIdColumn).append("""
                       AND a.is_primary = 1
                       AND a.status = 'ACTIVE'
                       AND a.end_date IS NOT NULL
                """);
        sql.append(" AND ").append(dialect.textDateGreaterOrEqualParam("a.end_date"));
        sql.append(" AND ").append(dialect.textDateLessOrEqualParam("a.end_date"));
        params.add(monthStart);
        params.add(monthEnd);
        sql.append("""
                 )
                 AND NOT EXISTS (
                     SELECT 1 FROM employee_project_assignment p
                     WHERE p.employee_id = """).append(employeeIdColumn).append("""
                       AND p.is_primary = 1
                       AND p.status = 'PLANNED'
                """);
        sql.append(" AND ").append(dialect.textDateGreaterThanParam("p.start_date"));
        params.add(today);
        sql.append(" ) ");
    }

    private long countScoped(String whereClause, List<Long> scopeDepartmentIds) {
        var sql = new StringBuilder("SELECT COUNT(*) FROM employee WHERE ").append(whereClause);
        var params = new ArrayList<Object>();
        appendDepartmentScopeClause(sql, params, scopeDepartmentIds, "");
        Long result = jdbc.queryForObject(sql.toString(), Long.class, params.toArray());
        return result != null ? result : 0L;
    }

    public List<DepartmentDto> findAllDepartments() {
        return jdbc.query(
                "SELECT id, name, parent_id FROM department ORDER BY id",
                (rs, rowNum) -> new DepartmentDto(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getObject("parent_id") != null ? rs.getLong("parent_id") : null
                )
        );
    }

    public List<NationalityDto> findAllNationalities() {
        return jdbc.query(
                """
                SELECT id, name, is_japan, sort_order, is_active
                FROM nationality
                WHERE is_active = TRUE
                ORDER BY sort_order, id
                """,
                (rs, rowNum) -> new NationalityDto(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getBoolean("is_japan"),
                        rs.getInt("sort_order"),
                        rs.getBoolean("is_active")
                )
        );
    }

    public List<ResidenceStatusDto> findAllResidenceStatuses() {
        return jdbc.query(
                """
                SELECT id, name, sort_order, is_active
                FROM residence_status
                WHERE is_active = TRUE
                ORDER BY sort_order, id
                """,
                (rs, rowNum) -> new ResidenceStatusDto(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getInt("sort_order"),
                        rs.getBoolean("is_active")
                )
        );
    }

    public List<EmployeeDto> search(
            String keyword,
            String employeeCode,
            String name,
            Long departmentId,
            String summaryFilter,
            String skillKeyword,
            String technicalCategory,
            String technicalItem,
            String technicalMinLevel,
            String employeeType,
            String workStatus,
            List<Long> scopeDepartmentIds
    ) {
        var sql = new StringBuilder("""
                SELECT e.id, e.employee_code, e.name, ep.furigana AS name_kana,
                       e.department_id, d.name AS department_name,
                       e.position, e.assignment_role, e.employee_type, e.work_status,
                       COALESCE(es.billing_unit_price, 0) AS unit_price,
                       e.evaluation, e.end_date
                FROM employee e
                LEFT JOIN department d ON d.id = e.department_id
                LEFT JOIN employee_salary es ON es.employee_id = e.id
                LEFT JOIN employee_personal ep ON ep.employee_id = e.id
                WHERE 1=1
                """);
        var params = new ArrayList<Object>();

        appendSummaryFilter(sql, params, summaryFilter);
        appendDepartmentScopeClause(sql, params, scopeDepartmentIds, "e");

        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + keyword.trim() + "%";
            sql.append(" AND (e.employee_code LIKE ? OR e.name LIKE ?)");
            params.add(pattern);
            params.add(pattern);
        } else {
            if (employeeCode != null && !employeeCode.isBlank()) {
                sql.append(" AND e.employee_code LIKE ?");
                params.add("%" + employeeCode.trim() + "%");
            }
            if (name != null && !name.isBlank()) {
                sql.append(" AND e.name LIKE ?");
                params.add("%" + name.trim() + "%");
            }
        }
        if (departmentId != null) {
            sql.append("""
                     AND (
                         e.department_id = ?
                         OR e.department_id IN (SELECT id FROM department WHERE parent_id = ?)
                     )
                    """);
            params.add(departmentId);
            params.add(departmentId);
        }
        appendSkillKeywordFilter(sql, params, skillKeyword);
        appendTechnicalSkillFilter(sql, params, technicalCategory, technicalItem, technicalMinLevel);
        appendExactFilter(sql, params, "e.employee_type", employeeType);
        appendExactFilter(sql, params, "e.work_status", workStatus);
        sql.append(" ORDER BY e.employee_code");

        return jdbc.query(sql.toString(), EMPLOYEE_MAPPER, params.toArray());
    }

    private void appendExactFilter(StringBuilder sql, List<Object> params, String column, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        sql.append(" AND ").append(column).append(" = ?");
        params.add(value.trim());
    }

    private void appendSkillKeywordFilter(StringBuilder sql, List<Object> params, String skillKeyword) {
        if (skillKeyword == null || skillKeyword.isBlank()) {
            return;
        }
        String pattern = "%" + skillKeyword.trim() + "%";
        sql.append("""
                 AND (
                     EXISTS (
                         SELECT 1 FROM employee_skill sk
                         WHERE sk.employee_id = e.id AND """);
        sql.append(dialect.likeIgnoreCase("sk.skill_name"));
        sql.append("""
                     )
                     OR EXISTS (
                         SELECT 1 FROM employee_technical_skill ts
                         WHERE ts.employee_id = e.id AND """);
        sql.append(dialect.likeIgnoreCase("ts.item_name"));
        sql.append("""
                     )
                     OR EXISTS (
                         SELECT 1 FROM employee_personal ep
                         WHERE ep.employee_id = e.id
                           AND (
                               """);
        sql.append(dialect.likeIgnoreCase("ep.specialty_dev"));
        sql.append(" OR ");
        sql.append(dialect.likeIgnoreCase("ep.specialty_business"));
        sql.append("""
                           )
                     )
                 )
                """);
        params.add(pattern);
        params.add(pattern);
        params.add(pattern);
        params.add(pattern);
    }

    private void appendTechnicalSkillFilter(
            StringBuilder sql,
            List<Object> params,
            String technicalCategory,
            String technicalItem,
            String technicalMinLevel
    ) {
        if (technicalCategory == null || technicalCategory.isBlank()) {
            return;
        }
        sql.append("""
                 AND EXISTS (
                     SELECT 1 FROM employee_technical_skill ts
                     WHERE ts.employee_id = e.id
                       AND ts.category = ?
                """);
        params.add(technicalCategory.trim());
        if (technicalItem != null && !technicalItem.isBlank()) {
            sql.append(" AND ts.item_name = ?");
            params.add(technicalItem.trim());
        }
        List<String> allowedLevels = TechnicalSkillLevel.levelsAtOrAbove(technicalMinLevel);
        if (allowedLevels != null) {
            sql.append(" AND ts.level IN (");
            sql.append("?,".repeat(allowedLevels.size()));
            sql.setLength(sql.length() - 1);
            sql.append(")");
            params.addAll(allowedLevels);
        } else if (technicalItem != null && !technicalItem.isBlank()) {
            sql.append(" AND ts.level IS NOT NULL AND ts.level != ''");
        }
        sql.append(")");
    }

    private void appendSummaryFilter(StringBuilder sql, List<Object> params, String summaryFilter) {
        if (summaryFilter == null || summaryFilter.isBlank()) {
            return;
        }
        switch (summaryFilter) {
            case jp.dispatch.employee.model.SummaryFilter.ACTIVE ->
                    sql.append(" AND e.work_status != '退職'");
            case jp.dispatch.employee.model.SummaryFilter.WORKING ->
                    sql.append(" AND e.work_status = '稼働中'");
            case jp.dispatch.employee.model.SummaryFilter.STANDBY ->
                    sql.append(" AND e.work_status = '待機中'");
            case jp.dispatch.employee.model.SummaryFilter.ENDING_THIS_MONTH -> {
                YearMonth currentMonth = YearMonth.now(ZONE);
                String monthStart = currentMonth.atDay(1).toString();
                String monthEnd = currentMonth.atEndOfMonth().toString();
                String today = LocalDate.now(ZONE).toString();
                sql.append(" AND e.work_status NOT IN ('退職', '休業')");
                appendEndingThisMonthConditions(sql, params, "e.id", monthStart, monthEnd, today);
            }
            default -> { /* ignore unknown */ }
        }
    }

    private void appendDepartmentScopeClause(
            StringBuilder sql,
            List<Object> params,
            List<Long> scopeDepartmentIds,
            String tableAlias
    ) {
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, tableAlias);
    }

    public Optional<EmployeeDto> findById(long id) {
        var list = jdbc.query(
                """
                SELECT e.id, e.employee_code, e.name, ep.furigana AS name_kana,
                       e.department_id, d.name AS department_name,
                       e.position, e.assignment_role, e.employee_type, e.work_status, e.unit_price, e.evaluation, e.end_date
                FROM employee e
                LEFT JOIN department d ON d.id = e.department_id
                LEFT JOIN employee_personal ep ON ep.employee_id = e.id
                WHERE e.id = ?
                """,
                EMPLOYEE_MAPPER,
                id
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getFirst());
    }

    public long insert(EmployeeRequest req) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    """
                    INSERT INTO employee (employee_code, name, department_id, position, assignment_role,
                        employee_type, work_status, unit_price, evaluation, end_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setString(1, req.employeeCode());
            ps.setString(2, req.name());
            setNullableLong(ps, 3, req.departmentId());
            ps.setString(4, normalizeOptionalText(req.position()));
            ps.setString(5, normalizeOptionalText(req.assignmentRole()));
            ps.setString(6, normalizeOptionalText(req.employeeType()));
            ps.setString(7, normalizeOptionalText(req.workStatus()));
            ps.setInt(8, req.unitPrice());
            ps.setString(9, req.evaluation());
            ps.setString(10, blankToNull(req.endDate()));
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "社員の作成に失敗しました");
    }

    public boolean update(long id, EmployeeRequest req) {
        int rows = jdbc.update(
                """
                UPDATE employee SET employee_code=?, name=?, department_id=?, position=?, assignment_role=?,
                    employee_type=?, work_status=?, unit_price=?, evaluation=?, end_date=?
                WHERE id=?
                """,
                req.employeeCode(),
                req.name(),
                hasDepartment(req.departmentId()) ? req.departmentId() : null,
                normalizeOptionalText(req.position()),
                normalizeOptionalText(req.assignmentRole()),
                normalizeOptionalText(req.employeeType()),
                normalizeOptionalText(req.workStatus()),
                req.unitPrice(),
                req.evaluation(),
                blankToNull(req.endDate()),
                id
        );
        return rows > 0;
    }

    public boolean departmentExists(Long departmentId) {
        return departmentId != null && departmentId > 0 && departmentExists(departmentId.longValue());
    }

    public boolean departmentExists(long departmentId) {
        if (departmentId <= 0) {
            return false;
        }
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM department WHERE id = ?",
                Long.class,
                departmentId
        );
        return count != null && count > 0;
    }

    public Optional<Long> findIdByEmployeeCode(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        var rows = jdbc.query(
                "SELECT id FROM employee WHERE employee_code = ?",
                (rs, rowNum) -> rs.getLong("id"),
                code.trim().toUpperCase(java.util.Locale.ROOT)
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public Optional<String> findCodeByExactName(String name) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        var rows = jdbc.query(
                "SELECT employee_code FROM employee WHERE name = ?",
                (rs, rowNum) -> rs.getString("employee_code"),
                name.trim()
        );
        if (rows.size() != 1) {
            return Optional.empty();
        }
        return Optional.of(rows.getFirst().toUpperCase(java.util.Locale.ROOT));
    }

    public boolean codeExists(String code, Long excludeId) {
        if (excludeId == null) {
            Long count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM employee WHERE employee_code = ?",
                    Long.class,
                    code
            );
            return count != null && count > 0;
        }
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM employee WHERE employee_code = ? AND id != ?",
                Long.class,
                code,
                excludeId
        );
        return count != null && count > 0;
    }

    /** 次の社員ID（E001形式）を採番する */
    public String generateNextEmployeeCode() {
        Integer maxNum = jdbc.queryForObject(
                """
                SELECT MAX(CAST(SUBSTR(employee_code, 2) AS INTEGER))
                FROM employee
                WHERE %s""".formatted(dialect.employeeCodeNumericFilter()),
                Integer.class
        );
        int next = (maxNum != null ? maxNum : 0) + 1;
        return String.format("E%03d", next);
    }

    public void updateEvaluation(long employeeId, String evaluation) {
        jdbc.update("UPDATE employee SET evaluation = ? WHERE id = ?", evaluation, employeeId);
    }

    public Optional<EmployeeStatusRow> findStatusById(long id) {
        var rows = jdbc.query(
                "SELECT id, work_status, end_date FROM employee WHERE id = ?",
                (rs, rowNum) -> new EmployeeStatusRow(
                        rs.getLong("id"),
                        rs.getString("work_status"),
                        rs.getString("end_date")
                ),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public void updateWorkStatusAndEndDate(long id, String workStatus, String endDate) {
        jdbc.update(
                "UPDATE employee SET work_status = ?, end_date = ? WHERE id = ?",
                workStatus,
                endDate,
                id
        );
    }

    public List<EmployeeStatusRow> findAllForMaintenance() {
        return jdbc.query(
                """
                SELECT id, work_status, end_date
                FROM employee
                WHERE work_status NOT IN ('休業', '退職予定', '退職')
                """,
                (rs, rowNum) -> new EmployeeStatusRow(
                        rs.getLong("id"),
                        rs.getString("work_status"),
                        rs.getString("end_date")
                )
        );
    }

    public record EmployeeStatusRow(long id, String workStatus, String endDate) {
    }

    private static Long readNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private static void setNullableLong(PreparedStatement ps, int index, Long value) throws java.sql.SQLException {
        if (value != null && value > 0) {
            ps.setLong(index, value);
        } else {
            ps.setNull(index, Types.INTEGER);
        }
    }

    private static boolean hasDepartment(Long departmentId) {
        return departmentId != null && departmentId > 0;
    }

    private static String normalizeOptionalText(String value) {
        return value == null ? "" : value.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
