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
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class EmployeeRepository {

    private static final ZoneId ZONE = ZoneId.of("Asia/Tokyo");
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private static final RowMapper<EmployeeDto> EMPLOYEE_MAPPER = (rs, rowNum) -> new EmployeeDto(
            rs.getLong("id"),
            rs.getString("employee_code"),
            rs.getString("name"),
            rs.getString("name_kana"),
            readNullableLong(rs, "department_id"),
            rs.getString("department_name"),
            rs.getString("affiliation_company"),
            rs.getString("position"),
            rs.getString("assignment_role"),
            rs.getString("employee_type"),
            rs.getString("work_status"),
            rs.getInt("unit_price"),
            rs.getString("evaluation"),
            rs.getString("end_date"),
            false,
            rs.getInt("version"),
            rs.getString("updated_at"),
            rs.getString("updated_by_name")
    );

    private final JdbcTemplate jdbc;
    private final DatabaseDialect dialect;

    public EmployeeRepository(JdbcTemplate jdbc, DatabaseDialect dialect) {
        this.jdbc = jdbc;
        this.dialect = dialect;
    }

    public SummaryDto fetchSummary(List<Long> scopeDepartmentIds, String scopeAffiliationCompany) {
        List<String> companies = scopeAffiliationCompany == null || scopeAffiliationCompany.isBlank()
                ? null
                : List.of(scopeAffiliationCompany.trim());
        return fetchSummary(scopeDepartmentIds, companies);
    }

    public SummaryDto fetchSummary(List<Long> scopeDepartmentIds, List<String> scopeAffiliationCompanies) {
        YearMonth currentMonth = YearMonth.now(ZONE);
        String monthStart = currentMonth.atDay(1).toString();
        String monthEnd = currentMonth.atEndOfMonth().toString();
        String today = LocalDate.now(ZONE).toString();

        long active = countScoped("work_status != '退職'", scopeDepartmentIds, scopeAffiliationCompanies);
        long working = countScoped("work_status = '稼働中'", scopeDepartmentIds, scopeAffiliationCompanies);
        long standby = countScoped("work_status = '待機中'", scopeDepartmentIds, scopeAffiliationCompanies);
        long endingThisMonth = countEndingThisMonth(
                monthStart, monthEnd, today, scopeDepartmentIds, scopeAffiliationCompanies);

        return new SummaryDto(active, working, standby, endingThisMonth);
    }

    private long countEndingThisMonth(
            String monthStart,
            String monthEnd,
            String today,
            List<Long> scopeDepartmentIds,
            List<String> scopeAffiliationCompanies
    ) {
        var sql = new StringBuilder("""
                SELECT COUNT(DISTINCT e.id) FROM employee e
                WHERE e.work_status NOT IN ('退職', '休業')
                """);
        var params = new ArrayList<Object>();
        appendEndingThisMonthConditions(sql, params, "e.id", monthStart, monthEnd, today);
        appendDepartmentScopeClause(sql, params, scopeDepartmentIds, "e");
        appendAffiliationCompanyScopeClause(sql, params, scopeAffiliationCompanies, "e");
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

    private long countScoped(
            String whereClause,
            List<Long> scopeDepartmentIds,
            List<String> scopeAffiliationCompanies
    ) {
        var sql = new StringBuilder("SELECT COUNT(*) FROM employee WHERE ").append(whereClause);
        var params = new ArrayList<Object>();
        appendDepartmentScopeClause(sql, params, scopeDepartmentIds, "");
        appendAffiliationCompanyScopeClause(sql, params, scopeAffiliationCompanies, "");
        Long result = jdbc.queryForObject(sql.toString(), Long.class, params.toArray());
        return result != null ? result : 0L;
    }

    public List<DepartmentDto> findAllDepartments() {
        return jdbc.query(
                "SELECT id, name, parent_id, company FROM department ORDER BY id",
                (rs, rowNum) -> new DepartmentDto(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getObject("parent_id") != null ? rs.getLong("parent_id") : null,
                        rs.getString("company")
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
            String affiliationCompany,
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
                       e.affiliation_company,
                       e.position, e.assignment_role, e.employee_type, e.work_status,
                       COALESCE(es.billing_unit_price, 0) AS unit_price,
                       e.evaluation, e.end_date,
                       COALESCE(e.version, 1) AS version,
                       e.updated_at,
                       COALESCE(NULLIF(TRIM(au.display_name), ''), au.username) AS updated_by_name
                FROM employee e
                LEFT JOIN department d ON d.id = e.department_id
                LEFT JOIN employee_salary es ON es.employee_id = e.id
                LEFT JOIN employee_personal ep ON ep.employee_id = e.id
                LEFT JOIN auth_user au ON au.id = e.updated_by
                WHERE 1=1
                """);
        var params = new ArrayList<Object>();

        appendSummaryFilter(sql, params, summaryFilter);
        appendDepartmentScopeClause(sql, params, scopeDepartmentIds, "e");
        // affiliationCompany は検索条件としても渡される（営業スコープ時は呼び出し側で強制）

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
        appendExactFilter(sql, params, "e.affiliation_company", affiliationCompany);
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

    /**
     * {@code null} = 会社条件なし、空リスト = 閲覧不可（0件）、非空 = IN / = 条件。
     */
    private void appendAffiliationCompanyScopeClause(
            StringBuilder sql,
            List<Object> params,
            List<String> scopeAffiliationCompanies,
            String tableAlias
    ) {
        if (scopeAffiliationCompanies == null) {
            return;
        }
        if (scopeAffiliationCompanies.isEmpty()) {
            sql.append(" AND 1=0");
            return;
        }
        String column = tableAlias == null || tableAlias.isBlank()
                ? "affiliation_company"
                : tableAlias + ".affiliation_company";
        if (scopeAffiliationCompanies.size() == 1) {
            sql.append(" AND ").append(column).append(" = ?");
            params.add(scopeAffiliationCompanies.getFirst().trim());
            return;
        }
        sql.append(" AND ").append(column).append(" IN (");
        for (int i = 0; i < scopeAffiliationCompanies.size(); i++) {
            if (i > 0) {
                sql.append(", ");
            }
            sql.append("?");
            params.add(scopeAffiliationCompanies.get(i).trim());
        }
        sql.append(")");
    }

    public Optional<EmployeeDto> findById(long id) {
        var list = jdbc.query(
                """
                SELECT e.id, e.employee_code, e.name, ep.furigana AS name_kana,
                       e.department_id, d.name AS department_name,
                       e.affiliation_company,
                       e.position, e.assignment_role, e.employee_type, e.work_status, e.unit_price, e.evaluation, e.end_date,
                       COALESCE(e.version, 1) AS version,
                       e.updated_at,
                       COALESCE(NULLIF(TRIM(au.display_name), ''), au.username) AS updated_by_name
                FROM employee e
                LEFT JOIN department d ON d.id = e.department_id
                LEFT JOIN employee_personal ep ON ep.employee_id = e.id
                LEFT JOIN auth_user au ON au.id = e.updated_by
                WHERE e.id = ?
                """,
                EMPLOYEE_MAPPER,
                id
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getFirst());
    }

    public long insert(EmployeeRequest req, Long createdByUserId) {
        String now = nowTimestamp();
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    """
                    INSERT INTO employee (employee_code, name, department_id, affiliation_company, position, assignment_role,
                        employee_type, work_status, unit_price, evaluation, end_date,
                        version, updated_at, updated_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setString(1, req.employeeCode());
            ps.setString(2, req.name());
            setNullableLong(ps, 3, req.departmentId());
            ps.setString(4, normalizeOptionalText(req.affiliationCompany()));
            ps.setString(5, normalizeOptionalText(req.position()));
            ps.setString(6, normalizeOptionalText(req.assignmentRole()));
            ps.setString(7, normalizeOptionalText(req.employeeType()));
            ps.setString(8, normalizeOptionalText(req.workStatus()));
            ps.setInt(9, req.unitPrice());
            ps.setString(10, req.evaluation());
            ps.setString(11, blankToNull(req.endDate()));
            ps.setString(12, now);
            setNullableLong(ps, 13, createdByUserId);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "社員の作成に失敗しました");
    }

    /** @return true if updated; false if version conflict or missing row */
    public boolean updateOptimistic(long id, EmployeeRequest req, int expectedVersion, Long updatedByUserId) {
        int rows = jdbc.update(
                """
                UPDATE employee SET employee_code=?, name=?, department_id=?, affiliation_company=?, position=?, assignment_role=?,
                    employee_type=?, work_status=?, unit_price=?, evaluation=?, end_date=?,
                    version = version + 1, updated_at = ?, updated_by = ?
                WHERE id=? AND version=?
                """,
                req.employeeCode(),
                req.name(),
                hasDepartment(req.departmentId()) ? req.departmentId() : null,
                normalizeOptionalText(req.affiliationCompany()),
                normalizeOptionalText(req.position()),
                normalizeOptionalText(req.assignmentRole()),
                normalizeOptionalText(req.employeeType()),
                normalizeOptionalText(req.workStatus()),
                req.unitPrice(),
                req.evaluation(),
                blankToNull(req.endDate()),
                nowTimestamp(),
                updatedByUserId,
                id,
                expectedVersion
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

    /**
     * 指定プレフィックス（例：btcS）で使用中の5桁連番一覧を返す。
     * 欠番優先の推奨番号算出に使う。
     */
    public List<Integer> findUsedSerials(String codeHead) {
        if (codeHead == null || codeHead.isBlank()) {
            return List.of();
        }
        String head = codeHead.trim();
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                "^" + java.util.regex.Pattern.quote(head) + "([0-9]{5})$"
        );
        return jdbc.query(
                """
                SELECT employee_code
                FROM employee
                WHERE employee_code LIKE ?
                """,
                (rs, rowNum) -> rs.getString("employee_code"),
                head + "%"
        ).stream()
                .map(code -> {
                    var matcher = pattern.matcher(code == null ? "" : code);
                    if (!matcher.matches()) {
                        return null;
                    }
                    return Integer.parseInt(matcher.group(1));
                })
                .filter(java.util.Objects::nonNull)
                .sorted()
                .toList();
    }

    /** 姓名・性別・生年月日・来日年月が一致する社員がいるか（空文字同士も一致） */
    public boolean existsIdentityMatch(
            String name,
            String gender,
            String birthDate,
            String japanArrivalDate,
            Long excludeId
    ) {
        String n = name == null ? "" : name.trim();
        String g = gender == null ? "" : gender.trim();
        String b = birthDate == null ? "" : birthDate.trim();
        String j = japanArrivalDate == null ? "" : japanArrivalDate.trim();
        if (excludeId == null) {
            Long count = jdbc.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM employee e
                    LEFT JOIN employee_personal p ON p.employee_id = e.id
                    WHERE e.name = ?
                      AND COALESCE(TRIM(p.gender), '') = ?
                      AND COALESCE(TRIM(p.birth_date), '') = ?
                      AND COALESCE(TRIM(p.japan_arrival_date), '') = ?
                    """,
                    Long.class,
                    n, g, b, j
            );
            return count != null && count > 0;
        }
        Long count = jdbc.queryForObject(
                """
                SELECT COUNT(*)
                FROM employee e
                LEFT JOIN employee_personal p ON p.employee_id = e.id
                WHERE e.id != ?
                  AND e.name = ?
                  AND COALESCE(TRIM(p.gender), '') = ?
                  AND COALESCE(TRIM(p.birth_date), '') = ?
                  AND COALESCE(TRIM(p.japan_arrival_date), '') = ?
                """,
                Long.class,
                excludeId, n, g, b, j
        );
        return count != null && count > 0;
    }

    public Optional<String> findDepartmentNameById(Long departmentId) {
        if (departmentId == null || departmentId <= 0) {
            return Optional.empty();
        }
        var rows = jdbc.query(
                "SELECT name FROM department WHERE id = ?",
                (rs, rowNum) -> rs.getString("name"),
                departmentId
        );
        return rows.isEmpty() ? Optional.empty() : Optional.ofNullable(rows.getFirst());
    }

    public Optional<String> findDepartmentCompanyById(Long departmentId) {
        if (departmentId == null || departmentId <= 0) {
            return Optional.empty();
        }
        var rows = jdbc.query(
                "SELECT company FROM department WHERE id = ?",
                (rs, rowNum) -> rs.getString("company"),
                departmentId
        );
        return rows.isEmpty() ? Optional.empty() : Optional.ofNullable(rows.getFirst());
    }

    public void updateEvaluation(long employeeId, String evaluation) {
        jdbc.update(
                """
                UPDATE employee
                SET evaluation = ?,
                    version = COALESCE(version, 1) + 1,
                    updated_at = ?
                WHERE id = ?
                """,
                evaluation,
                nowTimestamp(),
                employeeId
        );
    }

    private static String nowTimestamp() {
        return LocalDateTime.now(ZONE).format(TIMESTAMP);
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
                """
                UPDATE employee
                SET work_status = ?, end_date = ?,
                    version = COALESCE(version, 1) + 1,
                    updated_at = ?
                WHERE id = ?
                """,
                workStatus,
                endDate,
                nowTimestamp(),
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

    /** 退社日が設定されている社員（稼働状況の自動更新用） */
    public List<ResignationStatusRow> findAllWithResignationDate() {
        return jdbc.query(
                """
                SELECT e.id, e.work_status, e.end_date, h.resignation_date
                FROM employee e
                INNER JOIN employee_hr h ON h.employee_id = e.id
                WHERE h.resignation_date IS NOT NULL
                  AND TRIM(h.resignation_date) <> ''
                """,
                (rs, rowNum) -> new ResignationStatusRow(
                        rs.getLong("id"),
                        rs.getString("work_status"),
                        rs.getString("end_date"),
                        rs.getString("resignation_date")
                )
        );
    }

    public record EmployeeStatusRow(long id, String workStatus, String endDate) {
    }

    public record ResignationStatusRow(long id, String workStatus, String endDate, String resignationDate) {
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
