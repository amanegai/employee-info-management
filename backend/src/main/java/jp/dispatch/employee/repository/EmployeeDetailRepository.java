package jp.dispatch.employee.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jp.dispatch.employee.dto.EmployeeDetailDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.*;
import jp.dispatch.employee.dto.EmployeeSaveRequest;
import jp.dispatch.employee.dto.EmployeeSaveRequest.EvaluationItemSaveDto;
import jp.dispatch.employee.model.EvaluationCalculator;
import jp.dispatch.employee.model.EvaluationCalculator.ParsedEvaluation;
import jp.dispatch.employee.model.EvaluationCategoryMeta;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Repository
public class EmployeeDetailRepository {

    private static final Pattern PERIOD_LABEL_PATTERN = Pattern.compile("(\\d{4})年(\\d{1,2})月");

    private final JdbcTemplate jdbc;
    private final EmployeeRepository employeeRepository;
    private final ObjectMapper objectMapper;

    public EmployeeDetailRepository(
            JdbcTemplate jdbc,
            EmployeeRepository employeeRepository,
            ObjectMapper objectMapper
    ) {
        this.jdbc = jdbc;
        this.employeeRepository = employeeRepository;
        this.objectMapper = objectMapper;
    }

    public Optional<EmployeeDetailDto> findDetail(long employeeId) {
        return employeeRepository.findById(employeeId).map(emp -> new EmployeeDetailDto(
                emp.id(),
                emp.employeeCode(),
                emp.name(),
                emp.departmentId(),
                emp.departmentName(),
                emp.position(),
                emp.assignmentRole(),
                emp.employeeType(),
                emp.workStatus(),
                emp.unitPrice(),
                emp.evaluation(),
                emp.endDate(),
                findPersonal(employeeId).orElse(null),
                findSkills(employeeId),
                findTechnicalSkills(employeeId),
                findQualifications(employeeId),
                findCareers(employeeId),
                findLatestAttendance(employeeId).orElse(null),
                findEvaluationHistory(employeeId).orElse(null),
                findMemo(employeeId).orElse(null),
                findEvaluationCategories(employeeId),
                findOverallEvaluation(employeeId, emp.evaluation()).orElse(null),
                findSalary(employeeId).orElse(null),
                findHr(employeeId).orElse(null),
                findMonthlyExpenses(employeeId),
                null,
                false
        ));
    }

    public boolean deleteEmployee(long id) {
        jdbc.update("DELETE FROM employee_personal WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_skill WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_technical_skill WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_qualification WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_career WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_attendance WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_evaluation_history WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_memo WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_evaluation_item WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_overall_evaluation WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_salary WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_hr WHERE employee_id = ?", id);
        jdbc.update("DELETE FROM employee_monthly_expense WHERE employee_id = ?", id);
        int rows = jdbc.update("DELETE FROM employee WHERE id = ?", id);
        return rows > 0;
    }

    public void saveDetail(long employeeId, EmployeeSaveRequest req) {
        savePersonal(employeeId, req.personal());
        replaceSkills(employeeId, req.skills());
        replaceTechnicalSkills(employeeId, req.technicalSkills());
        replaceQualifications(employeeId, req.qualifications());
        replaceCareers(employeeId, req.careers());
        saveAttendance(employeeId, req.attendance());
        saveEvaluationHistory(employeeId, req.evaluationHistory());
        saveMemo(employeeId, req.memo());
        replaceEvaluationItems(employeeId, req.evaluationItems());
        saveOverallEvaluation(employeeId, req.overallEvaluation());
        saveSalary(employeeId, req.salary());
        saveHr(employeeId, req.hr());
    }

    private void savePersonal(long employeeId, PersonalDto personal) {
        jdbc.update("DELETE FROM employee_personal WHERE employee_id = ?", employeeId);
        if (personal == null || isPersonalEmpty(personal)) {
            return;
        }
        jdbc.update(
                """
                INSERT INTO employee_personal
                    (employee_id, gender, birth_date, nationality, phone, email, address, education,
                     nearest_station, photo_url, furigana, marital_status, it_industry_years, japan_arrival_date,
                     education_degree, school_name, major, japanese_level, japanese_conversation, japanese_reading,
                     japanese_writing, english_level, english_conversation, english_reading, english_writing,
                     technical_level, specialty_dev, specialty_business, self_pr)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                employeeId,
                personal.gender(),
                blankToNull(personal.birthDate()),
                personal.nationality(),
                personal.phone(),
                personal.email(),
                personal.address(),
                personal.education(),
                personal.nearestStation(),
                personal.photoUrl(),
                personal.furigana(),
                personal.maritalStatus(),
                personal.itIndustryYears(),
                blankToNull(personal.japanArrivalDate()),
                personal.educationDegree(),
                personal.schoolName(),
                personal.major(),
                personal.japaneseLevel(),
                personal.japaneseConversation(),
                personal.japaneseReading(),
                personal.japaneseWriting(),
                personal.englishLevel(),
                personal.englishConversation(),
                personal.englishReading(),
                personal.englishWriting(),
                personal.technicalLevel(),
                personal.specialtyDev(),
                personal.specialtyBusiness(),
                personal.selfPr()
        );
    }

    private boolean isPersonalEmpty(PersonalDto p) {
        return isBlank(p.gender()) && isBlank(p.birthDate()) && isBlank(p.nationality())
                && isBlank(p.phone()) && isBlank(p.email()) && isBlank(p.address())
                && isBlank(p.education()) && isBlank(p.nearestStation()) && isBlank(p.photoUrl())
                && isBlank(p.furigana()) && isBlank(p.maritalStatus()) && p.itIndustryYears() == null
                && isBlank(p.japanArrivalDate()) && isBlank(p.educationDegree()) && isBlank(p.schoolName())
                && isBlank(p.major()) && isBlank(p.japaneseLevel()) && isBlank(p.japaneseConversation())
                && isBlank(p.japaneseReading()) && isBlank(p.japaneseWriting()) && isBlank(p.englishLevel())
                && isBlank(p.englishConversation()) && isBlank(p.englishReading()) && isBlank(p.englishWriting())
                && isBlank(p.technicalLevel()) && isBlank(p.specialtyDev()) && isBlank(p.specialtyBusiness())
                && isBlank(p.selfPr());
    }

    private void replaceSkills(long employeeId, List<SkillDto> skills) {
        jdbc.update("DELETE FROM employee_skill WHERE employee_id = ?", employeeId);
        if (skills == null) {
            return;
        }
        int order = 0;
        for (SkillDto skill : skills) {
            if (skill == null || isBlank(skill.skillName())) {
                continue;
            }
            jdbc.update(
                    """
                    INSERT INTO employee_skill (employee_id, skill_name, level, experience_years, sort_order)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    employeeId,
                    skill.skillName().trim(),
                    Math.max(1, Math.min(5, skill.level())),
                    Math.max(0, skill.experienceYears()),
                    order++
            );
        }
    }

    private void replaceTechnicalSkills(long employeeId, List<TechnicalSkillDto> technicalSkills) {
        jdbc.update("DELETE FROM employee_technical_skill WHERE employee_id = ?", employeeId);
        if (technicalSkills == null) {
            return;
        }
        int order = 0;
        for (TechnicalSkillDto item : technicalSkills) {
            if (item == null || isBlank(item.category()) || isBlank(item.itemName()) || isBlank(item.level())) {
                continue;
            }
            jdbc.update(
                    """
                    INSERT INTO employee_technical_skill (employee_id, category, item_name, level, sort_order)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    employeeId,
                    item.category().trim(),
                    item.itemName().trim(),
                    item.level().trim(),
                    order++
            );
        }
    }

    private void replaceQualifications(long employeeId, List<QualificationDto> qualifications) {
        jdbc.update("DELETE FROM employee_qualification WHERE employee_id = ?", employeeId);
        if (qualifications == null) {
            return;
        }
        int order = 0;
        for (QualificationDto q : qualifications) {
            if (q == null || isBlank(q.description())) {
                continue;
            }
            jdbc.update(
                    """
                    INSERT INTO employee_qualification (employee_id, description, sort_order)
                    VALUES (?, ?, ?)
                    """,
                    employeeId,
                    q.description().trim(),
                    order++
            );
        }
    }

    private void replaceCareers(long employeeId, List<CareerDto> careers) {
        jdbc.update("DELETE FROM employee_career WHERE employee_id = ?", employeeId);
        if (careers == null) {
            return;
        }
        int order = 0;
        for (CareerDto c : careers) {
            if (c == null || isCareerEmpty(c)) {
                continue;
            }
            String period = !isBlank(c.period()) ? c.period().trim() : buildCareerPeriod(c);
            String organization = c.organization() != null ? c.organization().trim() : "";
            jdbc.update(
                    """
                    INSERT INTO employee_career
                        (employee_id, period, organization, role_overview, sort_order,
                         start_date, end_date, months, workplace, role, os_db, languages, fw_tools, phases)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    employeeId,
                    period,
                    organization,
                    c.roleOverview() != null ? c.roleOverview().trim() : "",
                    order++,
                    blankToNull(c.startDate()),
                    blankToNull(c.endDate()),
                    c.months(),
                    c.workplace(),
                    c.role(),
                    c.osDb(),
                    c.languages(),
                    c.fwTools(),
                    c.phases()
            );
        }
    }

    private boolean isCareerEmpty(CareerDto c) {
        boolean hasPeriod = !isBlank(c.period()) || !isBlank(c.startDate());
        boolean hasContent = !isBlank(c.organization()) || !isBlank(c.roleOverview());
        return !hasPeriod || !hasContent;
    }

    private String buildCareerPeriod(CareerDto c) {
        String start = blankToNull(c.startDate());
        String end = blankToNull(c.endDate());
        if (start == null) {
            return "";
        }
        return end != null ? start + "～" + end : start + "～";
    }

    private void saveAttendance(long employeeId, AttendanceDto attendance) {
        if (attendance == null) {
            return;
        }
        String targetMonth = resolveTargetMonth(attendance.periodLabel());
        List<DailyAttendanceDto> dailyRecords = attendance.dailyRecords();
        if (dailyRecords == null || dailyRecords.isEmpty()) {
            dailyRecords = findAttendanceForMonth(employeeId, targetMonth)
                    .map(AttendanceDto::dailyRecords)
                    .orElse(List.of());
        }
        if (attendance.attendanceRate() == 0 && attendance.lateEarlyCount() == 0
                && attendance.paidLeaveRemaining() == 0 && isBlank(attendance.periodLabel())
                && attendance.workDays() == 0 && attendance.workHours() == 0
                && dailyRecords.isEmpty()) {
            jdbc.update(
                    "DELETE FROM employee_attendance WHERE employee_id = ? AND target_month = ?",
                    employeeId,
                    targetMonth
            );
            return;
        }
        jdbc.update(
                "DELETE FROM employee_attendance WHERE employee_id = ? AND target_month = ?",
                employeeId,
                targetMonth
        );
        jdbc.update(
                """
                INSERT INTO employee_attendance
                    (employee_id, target_month, attendance_rate, late_early_count, paid_leave_remaining,
                     period_label, work_days, work_hours, daily_records)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)
                """,
                employeeId,
                targetMonth,
                Math.max(0, Math.min(100, attendance.attendanceRate())),
                Math.max(0, attendance.lateEarlyCount()),
                Math.max(0, attendance.paidLeaveRemaining()),
                attendance.periodLabel(),
                Math.max(0, attendance.workDays()),
                Math.max(0, attendance.workHours()),
                toDailyRecordsJson(dailyRecords)
        );
    }

    public void syncAttendanceFromTimesheet(
            long employeeId,
            AttendanceDto incoming,
            String targetMonth,
            boolean preservePaidLeave
    ) {
        AttendanceDto merged = incoming;
        if (preservePaidLeave) {
            String month = normalizeTargetMonth(targetMonth, incoming.periodLabel());
            int paidLeave = findAttendanceForMonth(employeeId, month)
                    .map(AttendanceDto::paidLeaveRemaining)
                    .orElseGet(() -> findLatestAttendance(employeeId)
                            .map(AttendanceDto::paidLeaveRemaining)
                            .orElse(0));
            merged = new AttendanceDto(
                    incoming.attendanceRate(),
                    incoming.lateEarlyCount(),
                    paidLeave,
                    incoming.periodLabel(),
                    incoming.workDays(),
                    incoming.workHours(),
                    incoming.dailyRecords()
            );
        }
        saveAttendance(employeeId, merged);
    }

    public List<String> listAttendanceMonths(long employeeId) {
        return jdbc.query(
                """
                SELECT target_month
                FROM employee_attendance
                WHERE employee_id = ?
                ORDER BY target_month DESC
                """,
                (rs, rowNum) -> rs.getString("target_month"),
                employeeId
        );
    }

    public Optional<AttendanceDto> findAttendanceForMonth(long employeeId, String targetMonth) {
        String month = normalizeTargetMonth(targetMonth, null);
        var list = jdbc.query(
                """
                SELECT attendance_rate, late_early_count, paid_leave_remaining, period_label, work_days, work_hours, daily_records
                FROM employee_attendance
                WHERE employee_id = ? AND target_month = ?
                """,
                (rs, rowNum) -> mapAttendanceRow(rs),
                employeeId,
                month
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getFirst());
    }

    public Optional<String> findEmployeeEmail(long employeeId) {
        return findPersonal(employeeId)
                .map(PersonalDto::email)
                .filter(email -> email != null && !email.isBlank());
    }

    static String resolveTargetMonth(String periodLabel) {
        if (periodLabel != null && !periodLabel.isBlank()) {
            Matcher matcher = PERIOD_LABEL_PATTERN.matcher(periodLabel.trim());
            if (matcher.find()) {
                return String.format("%s-%02d", matcher.group(1), Integer.parseInt(matcher.group(2)));
            }
        }
        return LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
    }

    private static String normalizeTargetMonth(String targetMonth, String periodLabel) {
        if (targetMonth != null && targetMonth.matches("\\d{4}-\\d{2}")) {
            return targetMonth;
        }
        return resolveTargetMonth(periodLabel);
    }

    public void syncMonthlyExpenseFromApplication(
            long employeeId,
            String targetMonth,
            int periodicPassAllowance,
            int commuterIndividualAllowance,
            int businessExpenseAllowance,
            String sourceFileName,
            Long sourceFileId
    ) {
        jdbc.update(
                """
                INSERT INTO employee_monthly_expense
                    (employee_id, target_month, periodic_pass_allowance, commuter_individual_allowance,
                     business_expense_allowance, source_file_name, source_file_id, imported_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                ON CONFLICT (employee_id, target_month) DO UPDATE SET
                    periodic_pass_allowance = EXCLUDED.periodic_pass_allowance,
                    commuter_individual_allowance = EXCLUDED.commuter_individual_allowance,
                    business_expense_allowance = EXCLUDED.business_expense_allowance,
                    source_file_name = EXCLUDED.source_file_name,
                    source_file_id = EXCLUDED.source_file_id,
                    imported_at = NOW()
                """,
                employeeId,
                targetMonth,
                Math.max(0, periodicPassAllowance),
                Math.max(0, commuterIndividualAllowance),
                Math.max(0, businessExpenseAllowance),
                sourceFileName,
                sourceFileId
        );
    }

    private void saveEvaluationHistory(long employeeId, EvaluationHistoryDto history) {
        jdbc.update("DELETE FROM employee_evaluation_history WHERE employee_id = ?", employeeId);
        if (history == null || isBlank(history.yearLabel()) || isBlank(history.statusText())) {
            return;
        }
        jdbc.update(
                """
                INSERT INTO employee_evaluation_history
                    (employee_id, year_label, status_text, next_evaluation_note)
                VALUES (?, ?, ?, ?)
                """,
                employeeId,
                history.yearLabel().trim(),
                history.statusText().trim(),
                history.nextEvaluationNote()
        );
    }

    private void saveMemo(long employeeId, String memo) {
        jdbc.update("DELETE FROM employee_memo WHERE employee_id = ?", employeeId);
        if (isBlank(memo)) {
            return;
        }
        jdbc.update(
                "INSERT INTO employee_memo (employee_id, content) VALUES (?, ?)",
                employeeId,
                memo.trim()
        );
    }

    private void replaceEvaluationItems(long employeeId, List<EvaluationItemSaveDto> items) {
        jdbc.update("DELETE FROM employee_evaluation_item WHERE employee_id = ?", employeeId);
        if (items == null) {
            return;
        }
        int order = 0;
        for (EvaluationItemSaveDto item : items) {
            if (item == null || isBlank(item.categoryCode()) || isBlank(item.itemName()) || isBlank(item.rankGrade())) {
                continue;
            }
            jdbc.update(
                    """
                    INSERT INTO employee_evaluation_item
                        (employee_id, category_code, item_name, rank_grade, comment, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    employeeId,
                    item.categoryCode().trim(),
                    item.itemName().trim(),
                    item.rankGrade().trim().substring(0, 1).toUpperCase(),
                    item.comment() != null ? item.comment().trim() : "",
                    order++
            );
        }
    }

    private void saveOverallEvaluation(long employeeId, OverallEvaluationDto overall) {
        jdbc.update("DELETE FROM employee_overall_evaluation WHERE employee_id = ?", employeeId);
        if (overall == null || isBlank(overall.overallRank())) {
            return;
        }
        jdbc.update(
                """
                INSERT INTO employee_overall_evaluation
                    (employee_id, overall_rank, rank_label, continuation_text, evaluation_date,
                     evaluator_name, evaluator_department, overall_comment)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                employeeId,
                overall.overallRank().trim().substring(0, 1).toUpperCase(),
                overall.rankLabel(),
                overall.continuationText(),
                blankToNull(overall.evaluationDate()),
                overall.evaluatorName(),
                overall.evaluatorDepartment(),
                overall.overallComment()
        );
    }

    private void saveSalary(long employeeId, SalaryDto salary) {
        jdbc.update("DELETE FROM employee_salary WHERE employee_id = ?", employeeId);
        if (salary == null) {
            return;
        }
        if (salary.basicSalaryMonthly() == 0
                && salary.commuterAllowance() == 0
                && salary.annualSalary() == 0
                && salary.bonus() == 0
                && salary.overtimeRate() == 0
                && salary.billingUnitPrice() == 0
                && salary.housingAllowance() == 0
                && salary.familyAllowance() == 0
                && salary.fixedOvertimeAllowance() == 0
                && salary.deductionHealthCare() == 0
                && salary.deductionHealth() == 0
                && salary.deductionPension() == 0
                && salary.deductionEmployment() == 0
                && salary.deductionIncomeTax() == 0
                && salary.deductionResidentTax() == 0
                && isBlank(salary.paymentDay())) {
            return;
        }
        jdbc.update(
                """
                INSERT INTO employee_salary
                    (employee_id, basic_salary_monthly, commuter_allowance, annual_salary,
                     bonus, overtime_rate, payment_day, billing_unit_price,
                     housing_allowance, family_allowance, fixed_overtime_allowance,
                     deduction_health_care, deduction_health, deduction_pension,
                     deduction_employment, deduction_income_tax, deduction_resident_tax)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                employeeId,
                Math.max(0, salary.basicSalaryMonthly()),
                Math.max(0, salary.commuterAllowance()),
                Math.max(0, salary.annualSalary()),
                Math.max(0, salary.bonus()),
                Math.max(0, salary.overtimeRate()),
                blankToNull(salary.paymentDay()),
                Math.max(0, salary.billingUnitPrice()),
                Math.max(0, salary.housingAllowance()),
                Math.max(0, salary.familyAllowance()),
                Math.max(0, salary.fixedOvertimeAllowance()),
                Math.max(0, salary.deductionHealthCare()),
                Math.max(0, salary.deductionHealth()),
                Math.max(0, salary.deductionPension()),
                Math.max(0, salary.deductionEmployment()),
                Math.max(0, salary.deductionIncomeTax()),
                Math.max(0, salary.deductionResidentTax())
        );
    }

    private void saveHr(long employeeId, HrDto hr) {
        jdbc.update("DELETE FROM employee_hr WHERE employee_id = ?", employeeId);
        if (hr == null || isHrEmpty(hr)) {
            return;
        }
        jdbc.update(
                """
                INSERT INTO employee_hr
                    (employee_id, hire_date, contract_start_date, contract_end_date,
                     social_insurance_status, employment_insurance_no, pension_no,
                     emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                     paid_leave_start_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                employeeId,
                blankToNull(hr.hireDate()),
                blankToNull(hr.contractStartDate()),
                blankToNull(hr.contractEndDate()),
                blankToNull(hr.socialInsuranceStatus()),
                blankToNull(hr.employmentInsuranceNo()),
                blankToNull(hr.pensionNo()),
                blankToNull(hr.emergencyContactName()),
                blankToNull(hr.emergencyContactPhone()),
                blankToNull(hr.emergencyContactRelation()),
                blankToNull(hr.paidLeaveStartDate())
        );
    }

    private boolean isHrEmpty(HrDto hr) {
        return isBlank(hr.hireDate())
                && isBlank(hr.contractStartDate())
                && isBlank(hr.contractEndDate())
                && isBlank(hr.socialInsuranceStatus())
                && isBlank(hr.employmentInsuranceNo())
                && isBlank(hr.pensionNo())
                && isBlank(hr.emergencyContactName())
                && isBlank(hr.emergencyContactPhone())
                && isBlank(hr.emergencyContactRelation())
                && isBlank(hr.paidLeaveStartDate());
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private Optional<PersonalDto> findPersonal(long employeeId) {
        var list = jdbc.query(
                """
                SELECT gender, birth_date, nationality, phone, email, address, education, nearest_station, photo_url,
                       furigana, marital_status, it_industry_years, japan_arrival_date, education_degree, school_name,
                       major, japanese_level, japanese_conversation, japanese_reading, japanese_writing,
                       english_level, english_conversation, english_reading, english_writing, technical_level,
                       specialty_dev, specialty_business, self_pr
                FROM employee_personal WHERE employee_id = ?
                """,
                (rs, rowNum) -> {
                    String birthDate = rs.getString("birth_date");
                    Integer age = null;
                    if (birthDate != null && !birthDate.isBlank()) {
                        age = Period.between(LocalDate.parse(birthDate), LocalDate.now()).getYears();
                    }
                    Integer itYears = rs.getObject("it_industry_years") != null
                            ? rs.getInt("it_industry_years") : null;
                    return new PersonalDto(
                            rs.getString("gender"),
                            birthDate,
                            age,
                            rs.getString("nationality"),
                            rs.getString("phone"),
                            rs.getString("email"),
                            rs.getString("address"),
                            rs.getString("education"),
                            rs.getString("nearest_station"),
                            rs.getString("photo_url"),
                            rs.getString("furigana"),
                            rs.getString("marital_status"),
                            itYears,
                            rs.getString("japan_arrival_date"),
                            rs.getString("education_degree"),
                            rs.getString("school_name"),
                            rs.getString("major"),
                            rs.getString("japanese_level"),
                            rs.getString("japanese_conversation"),
                            rs.getString("japanese_reading"),
                            rs.getString("japanese_writing"),
                            rs.getString("english_level"),
                            rs.getString("english_conversation"),
                            rs.getString("english_reading"),
                            rs.getString("english_writing"),
                            rs.getString("technical_level"),
                            rs.getString("specialty_dev"),
                            rs.getString("specialty_business"),
                            rs.getString("self_pr")
                    );
                },
                employeeId
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getFirst());
    }

    private List<SkillDto> findSkills(long employeeId) {
        return jdbc.query(
                """
                SELECT skill_name, level, experience_years FROM employee_skill
                WHERE employee_id = ? ORDER BY sort_order, id
                """,
                (rs, rowNum) -> new SkillDto(
                        rs.getString("skill_name"),
                        rs.getInt("level"),
                        rs.getInt("experience_years")
                ),
                employeeId
        );
    }

    private List<TechnicalSkillDto> findTechnicalSkills(long employeeId) {
        return jdbc.query(
                """
                SELECT category, item_name, level FROM employee_technical_skill
                WHERE employee_id = ? ORDER BY sort_order, id
                """,
                (rs, rowNum) -> new TechnicalSkillDto(
                        rs.getString("category"),
                        rs.getString("item_name"),
                        rs.getString("level")
                ),
                employeeId
        );
    }

    private List<QualificationDto> findQualifications(long employeeId) {
        return jdbc.query(
                "SELECT description FROM employee_qualification WHERE employee_id = ? ORDER BY sort_order, id",
                (rs, rowNum) -> new QualificationDto(rs.getString("description")),
                employeeId
        );
    }

    private List<CareerDto> findCareers(long employeeId) {
        return jdbc.query(
                """
                SELECT period, organization, role_overview, start_date, end_date, months,
                       workplace, role, os_db, languages, fw_tools, phases
                FROM employee_career
                WHERE employee_id = ? ORDER BY
                    CASE WHEN start_date IS NULL OR start_date = '' THEN 1 ELSE 0 END,
                    start_date DESC,
                    CASE WHEN end_date IS NULL OR end_date = '' THEN 1 ELSE 0 END,
                    end_date DESC,
                    sort_order,
                    id
                """,
                (rs, rowNum) -> {
                    Integer months = rs.getObject("months") != null ? rs.getInt("months") : null;
                    return new CareerDto(
                            rs.getString("period"),
                            rs.getString("organization"),
                            rs.getString("role_overview"),
                            rs.getString("start_date"),
                            rs.getString("end_date"),
                            months,
                            rs.getString("workplace"),
                            rs.getString("role"),
                            rs.getString("os_db"),
                            rs.getString("languages"),
                            rs.getString("fw_tools"),
                            rs.getString("phases")
                    );
                },
                employeeId
        );
    }

    private Optional<AttendanceDto> findLatestAttendance(long employeeId) {
        var list = jdbc.query(
                """
                SELECT attendance_rate, late_early_count, paid_leave_remaining, period_label, work_days, work_hours, daily_records
                FROM employee_attendance
                WHERE employee_id = ?
                ORDER BY target_month DESC
                LIMIT 1
                """,
                (rs, rowNum) -> mapAttendanceRow(rs),
                employeeId
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getFirst());
    }

    private AttendanceDto mapAttendanceRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new AttendanceDto(
                rs.getInt("attendance_rate"),
                rs.getInt("late_early_count"),
                rs.getInt("paid_leave_remaining"),
                rs.getString("period_label"),
                rs.getDouble("work_days"),
                rs.getDouble("work_hours"),
                parseDailyRecords(rs.getString("daily_records"))
        );
    }

    private String toDailyRecordsJson(List<DailyAttendanceDto> dailyRecords) {
        try {
            return objectMapper.writeValueAsString(dailyRecords != null ? dailyRecords : List.of());
        } catch (Exception ex) {
            throw new IllegalStateException("勤怠明細の保存に失敗しました", ex);
        }
    }

    private List<DailyAttendanceDto> parseDailyRecords(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<DailyAttendanceDto>>() {});
        } catch (Exception ex) {
            return List.of();
        }
    }

    private Optional<EvaluationHistoryDto> findEvaluationHistory(long employeeId) {
        var list = jdbc.query(
                """
                SELECT year_label, status_text, next_evaluation_note
                FROM employee_evaluation_history WHERE employee_id = ?
                """,
                (rs, rowNum) -> new EvaluationHistoryDto(
                        rs.getString("year_label"),
                        rs.getString("status_text"),
                        rs.getString("next_evaluation_note")
                ),
                employeeId
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getFirst());
    }

    private Optional<String> findMemo(long employeeId) {
        var list = jdbc.query(
                "SELECT content FROM employee_memo WHERE employee_id = ?",
                (rs, rowNum) -> rs.getString("content"),
                employeeId
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getFirst());
    }

    private Optional<SalaryDto> findSalary(long employeeId) {
        var list = jdbc.query(
                """
                SELECT basic_salary_monthly, commuter_allowance, annual_salary,
                       bonus, overtime_rate, payment_day, billing_unit_price,
                       housing_allowance, family_allowance, fixed_overtime_allowance,
                       deduction_health_care, deduction_health, deduction_pension,
                       deduction_employment, deduction_income_tax, deduction_resident_tax
                FROM employee_salary WHERE employee_id = ?
                """,
                (rs, rowNum) -> new SalaryDto(
                        rs.getInt("basic_salary_monthly"),
                        rs.getInt("commuter_allowance"),
                        rs.getInt("annual_salary"),
                        rs.getInt("bonus"),
                        rs.getInt("overtime_rate"),
                        rs.getString("payment_day"),
                        rs.getInt("billing_unit_price"),
                        rs.getInt("housing_allowance"),
                        rs.getInt("family_allowance"),
                        rs.getInt("fixed_overtime_allowance"),
                        rs.getInt("deduction_health_care"),
                        rs.getInt("deduction_health"),
                        rs.getInt("deduction_pension"),
                        rs.getInt("deduction_employment"),
                        rs.getInt("deduction_income_tax"),
                        rs.getInt("deduction_resident_tax")
                ),
                employeeId
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getFirst());
    }

    private List<MonthlyExpenseDto> findMonthlyExpenses(long employeeId) {
        return jdbc.query(
                """
                SELECT target_month, periodic_pass_allowance, commuter_individual_allowance,
                       business_expense_allowance, source_file_name, source_file_id, imported_at
                FROM employee_monthly_expense
                WHERE employee_id = ?
                ORDER BY target_month DESC
                """,
                (rs, rowNum) -> new MonthlyExpenseDto(
                        rs.getString("target_month"),
                        rs.getInt("periodic_pass_allowance"),
                        rs.getInt("commuter_individual_allowance"),
                        rs.getInt("business_expense_allowance"),
                        rs.getString("source_file_name"),
                        rs.getObject("source_file_id") != null ? rs.getLong("source_file_id") : null,
                        rs.getTimestamp("imported_at") != null
                                ? rs.getTimestamp("imported_at").toInstant().toString()
                                : null
                ),
                employeeId
        );
    }

    private Optional<HrDto> findHr(long employeeId) {
        var list = jdbc.query(
                """
                SELECT hire_date, contract_start_date, contract_end_date,
                       social_insurance_status, employment_insurance_no, pension_no,
                       emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                       paid_leave_start_date
                FROM employee_hr WHERE employee_id = ?
                """,
                (rs, rowNum) -> new HrDto(
                        rs.getString("hire_date"),
                        rs.getString("contract_start_date"),
                        rs.getString("contract_end_date"),
                        rs.getString("social_insurance_status"),
                        rs.getString("employment_insurance_no"),
                        rs.getString("pension_no"),
                        rs.getString("emergency_contact_name"),
                        rs.getString("emergency_contact_phone"),
                        rs.getString("emergency_contact_relation"),
                        rs.getString("paid_leave_start_date")
                ),
                employeeId
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getFirst());
    }

    private Optional<OverallEvaluationDto> findOverallEvaluation(long employeeId, String listEvaluation) {
        var list = jdbc.query(
                """
                SELECT overall_rank, rank_label, continuation_text, evaluation_date,
                       evaluator_name, evaluator_department, overall_comment
                FROM employee_overall_evaluation WHERE employee_id = ?
                """,
                (rs, rowNum) -> new OverallEvaluationDto(
                        rs.getString("overall_rank"),
                        rs.getString("rank_label"),
                        rs.getString("continuation_text"),
                        rs.getString("evaluation_date"),
                        rs.getString("evaluator_name"),
                        rs.getString("evaluator_department"),
                        rs.getString("overall_comment"),
                        null,
                        null
                ),
                employeeId
        );
        OverallEvaluationDto base = list.isEmpty() ? null : list.getFirst();
        OverallEvaluationDto enriched = enrichOverallEvaluation(base, listEvaluation);
        return enriched == null ? Optional.empty() : Optional.of(enriched);
    }

    private OverallEvaluationDto enrichOverallEvaluation(OverallEvaluationDto base, String listEvaluation) {
        if (isBlank(listEvaluation)) {
            return base;
        }
        ParsedEvaluation parsed = EvaluationCalculator.ParsedEvaluation.from(listEvaluation);
        if (parsed == null) {
            return base;
        }
        if (base == null) {
            return null;
        }
        return new OverallEvaluationDto(
                parsed.grade(),
                base.rankLabel() != null && !base.rankLabel().isBlank()
                        ? base.rankLabel()
                        : parsed.rankLabel(),
                base.continuationText(),
                base.evaluationDate(),
                base.evaluatorName(),
                base.evaluatorDepartment(),
                base.overallComment(),
                parsed.full(),
                parsed.level()
        );
    }

    private List<EvaluationCategoryDto> findEvaluationCategories(long employeeId) {
        var rows = jdbc.query(
                """
                SELECT category_code, item_name, rank_grade, comment, sort_order
                FROM employee_evaluation_item WHERE employee_id = ?
                ORDER BY category_code, sort_order, id
                """,
                (rs, rowNum) -> Map.entry(
                        rs.getString("category_code"),
                        new EvaluationItemDto(
                                rs.getString("item_name"),
                                rs.getString("rank_grade"),
                                rs.getString("comment")
                        )
                ),
                employeeId
        );

        Map<String, List<EvaluationItemDto>> grouped = new LinkedHashMap<>();
        for (var row : rows) {
            grouped.computeIfAbsent(row.getKey(), k -> new ArrayList<>()).add(row.getValue());
        }

        List<EvaluationCategoryDto> categories = new ArrayList<>();
        for (EvaluationCategoryMeta meta : EvaluationCategoryMeta.ALL) {
            List<EvaluationItemDto> items = grouped.get(meta.code());
            if (items != null && !items.isEmpty()) {
                categories.add(new EvaluationCategoryDto(
                        meta.code(),
                        meta.label(),
                        meta.headerColor(),
                        meta.icon(),
                        items
                ));
            }
        }
        return categories;
    }
}
