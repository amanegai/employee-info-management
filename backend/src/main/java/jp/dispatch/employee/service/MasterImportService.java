package jp.dispatch.employee.service;

import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.ClientSaveRequest;
import jp.dispatch.employee.dto.DepartmentDto;
import jp.dispatch.employee.dto.DepartmentFilter;
import jp.dispatch.employee.dto.EmployeeDetailDto.CareerDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.PersonalDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.QualificationDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.TechnicalSkillDto;
import jp.dispatch.employee.dto.EmployeeSaveRequest;
import jp.dispatch.employee.dto.MasterImportResultDto;
import jp.dispatch.employee.dto.MasterImportRowErrorDto;
import jp.dispatch.employee.dto.NationalityDto;
import jp.dispatch.employee.dto.ResidenceStatusDto;
import jp.dispatch.employee.model.AssignmentRoleCodes;
import jp.dispatch.employee.model.MasterData;
import jp.dispatch.employee.model.TechnicalSkillCatalog;
import jp.dispatch.employee.repository.ClientRepository;
import jp.dispatch.employee.repository.EmployeeRepository;
import jp.dispatch.employee.service.MasterExcelParser.ParsedRow;
import jp.dispatch.employee.service.MasterExcelParser.ParsedSheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class MasterImportService {

    private static final String EMPLOYEE_SHEET = "社員";
    private static final String CLIENT_SHEET = "取引先";
    private static final String QUALIFICATION_SHEET = "保有資格";
    private static final String TECHNICAL_SKILL_SHEET = "関連技術";
    private static final String CAREER_SHEET = "職務経歴";
    private static final List<String> EMPLOYEE_REQUIRED_HEADERS = List.of(
            "社員ID", "社員名", "稼働状況", "社員種別", "所属会社", "所属部門"
    );
    private static final List<String> CLIENT_REQUIRED_HEADERS = List.of("取引先名");
    private static final List<String> QUALIFICATION_REQUIRED_HEADERS = List.of("社員ID", "資格内容");
    private static final List<String> TECHNICAL_SKILL_REQUIRED_HEADERS = List.of("社員ID", "カテゴリ", "項目名", "レベル");
    private static final List<String> CAREER_REQUIRED_HEADERS = List.of("社員ID");
    private static final Set<String> GENDERS = Set.of("男性", "女性", "その他");
    private static final Set<String> MARITAL = Set.of("未婚", "既婚");
    private static final Set<String> EDUCATION = Set.of("学士", "修士", "博士", "その他");
    private static final Set<String> CONVERSATION = Set.of("A", "B", "C", "D");
    private static final Set<String> DOCUMENT_MARKS = Set.of("◎", "〇", "○", "△");
    private static final Set<String> TECHNICAL_LEVELS = Set.of("◎", "〇", "○", "△");
    private static final Set<String> CAREER_PHASES = Set.of(
            "要件定義", "基本設計", "詳細設計", "製造", "単体テスト", "結合テスト", "総合テスト"
    );
    private static final Map<String, String> CAREER_PHASE_ALIASES = Map.of(
            "実装", "製造",
            "保守運用", "総合テスト"
    );
    private static final Set<String> END_DATE_STATUSES = Set.of("退職予定", "案件終了間近", "休業");
    private static final int MAX_ERRORS = 100;
    private static final int PREVIEW_LIMIT = 8;

    private final MasterExcelParser parser;
    private final EmployeeService employeeService;
    private final ClientService clientService;
    private final EmployeeRepository employeeRepository;
    private final ClientRepository clientRepository;
    private final SecurityService securityService;
    private final AuditLogService auditLogService;

    public MasterImportService(
            MasterExcelParser parser,
            EmployeeService employeeService,
            ClientService clientService,
            EmployeeRepository employeeRepository,
            ClientRepository clientRepository,
            SecurityService securityService,
            AuditLogService auditLogService
    ) {
        this.parser = parser;
        this.employeeService = employeeService;
        this.clientService = clientService;
        this.employeeRepository = employeeRepository;
        this.clientRepository = clientRepository;
        this.securityService = securityService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public MasterImportResultDto importEmployees(MultipartFile file, boolean dryRun) {
        requireAdmin();
        Lookup lookup = buildLookup();
        List<MasterImportRowErrorDto> errors = new ArrayList<>();
        List<EmployeeSaveRequest> valid = new ArrayList<>();
        List<String> preview = new ArrayList<>();
        int skipped = 0;
        Set<String> codesInFile = new HashSet<>();
        Set<String> identitiesInFile = new HashSet<>();
        int employeeRowCount;

        try (Workbook workbook = parser.openWorkbook(file)) {
            ParsedSheet sheet = parser.parse(workbook, EMPLOYEE_SHEET, EMPLOYEE_REQUIRED_HEADERS, true);
            employeeRowCount = sheet.rows().size();
            ParsedSheet qualificationSheet = parser.parse(
                    workbook, QUALIFICATION_SHEET, QUALIFICATION_REQUIRED_HEADERS, true
            );
            ParsedSheet technicalSheet = parser.parse(
                    workbook, TECHNICAL_SKILL_SHEET, TECHNICAL_SKILL_REQUIRED_HEADERS, true
            );
            ParsedSheet careerSheet = parser.parse(workbook, CAREER_SHEET, CAREER_REQUIRED_HEADERS, true);

            List<PendingEmployee> pending = new ArrayList<>();
            for (ParsedRow row : sheet.rows()) {
                if (row.isSample()) {
                    skipped++;
                    continue;
                }
                List<MasterImportRowErrorDto> rowErrors = new ArrayList<>();
                EmployeeSaveRequest request = toEmployeeRequest(
                        row, lookup, codesInFile, identitiesInFile, rowErrors
                );
                pending.add(new PendingEmployee(row, request, rowErrors));
            }

            Set<String> employeeCodes = new HashSet<>(codesInFile);
            for (PendingEmployee item : pending) {
                String code = text(item.row(), "社員ID");
                if (!isBlank(code)) {
                    employeeCodes.add(code.trim().toUpperCase(Locale.ROOT));
                }
            }

            Map<String, List<QualificationDto>> qualificationsByCode = new LinkedHashMap<>();
            Map<String, List<TechnicalSkillDto>> technicalByCode = new LinkedHashMap<>();
            Map<String, List<CareerDto>> careersByCode = new LinkedHashMap<>();
            skipped += collectQualifications(qualificationSheet, employeeCodes, qualificationsByCode, errors);
            skipped += collectTechnicalSkills(technicalSheet, employeeCodes, technicalByCode, errors);
            skipped += collectCareers(careerSheet, employeeCodes, careersByCode, errors);

            for (PendingEmployee item : pending) {
                if (!item.rowErrors().isEmpty()) {
                    addErrors(errors, item.rowErrors());
                    continue;
                }
                String key = item.request().employeeCode().trim().toUpperCase(Locale.ROOT);
                EmployeeSaveRequest enriched = withSkillDetails(
                        item.request(),
                        qualificationsByCode.getOrDefault(key, List.of()),
                        technicalByCode.getOrDefault(key, List.of()),
                        careersByCode.getOrDefault(key, List.of())
                );
                valid.add(enriched);
                if (preview.size() < PREVIEW_LIMIT) {
                    preview.add(enriched.name());
                }
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Excelファイルを読み取れませんでした");
        }

        return finish("employee", dryRun, employeeRowCount, skipped, valid.size(), errors, preview, () -> {
            for (EmployeeSaveRequest request : valid) {
                employeeService.createFromMaster(request);
            }
            auditLogService.log(
                    AuditAction.MASTER_IMPORT,
                    "employee",
                    String.valueOf(valid.size()),
                    "社員マスタ一括登録 新規" + valid.size() + "件"
            );
        });
    }

    private int collectQualifications(
            ParsedSheet sheet,
            Set<String> employeeCodes,
            Map<String, List<QualificationDto>> byCode,
            List<MasterImportRowErrorDto> errors
    ) {
        int skipped = 0;
        for (ParsedRow row : sheet.rows()) {
            if (row.isSample()) {
                skipped++;
                continue;
            }
            List<MasterImportRowErrorDto> rowErrors = new ArrayList<>();
            String code = required(row, QUALIFICATION_SHEET, "社員ID", rowErrors);
            String description = required(row, QUALIFICATION_SHEET, "資格内容", rowErrors);
            String key = normalizeCodeKey(code);
            if (!isBlank(key) && !employeeCodes.contains(key)) {
                rowErrors.add(error(row, QUALIFICATION_SHEET, "社員ID", "「社員」シートに存在しない社員IDです"));
            }
            if (!rowErrors.isEmpty()) {
                addErrors(errors, rowErrors);
                continue;
            }
            byCode.computeIfAbsent(key, ignored -> new ArrayList<>())
                    .add(new QualificationDto(description.trim()));
        }
        return skipped;
    }

    private int collectTechnicalSkills(
            ParsedSheet sheet,
            Set<String> employeeCodes,
            Map<String, List<TechnicalSkillDto>> byCode,
            List<MasterImportRowErrorDto> errors
    ) {
        int skipped = 0;
        for (ParsedRow row : sheet.rows()) {
            if (row.isSample()) {
                skipped++;
                continue;
            }
            List<MasterImportRowErrorDto> rowErrors = new ArrayList<>();
            String code = required(row, TECHNICAL_SKILL_SHEET, "社員ID", rowErrors);
            String category = required(row, TECHNICAL_SKILL_SHEET, "カテゴリ", rowErrors);
            String itemName = required(row, TECHNICAL_SKILL_SHEET, "項目名", rowErrors);
            String levelRaw = required(row, TECHNICAL_SKILL_SHEET, "レベル", rowErrors);
            String level = normalizeMark(levelRaw);
            String key = normalizeCodeKey(code);

            if (!isBlank(key) && !employeeCodes.contains(key)) {
                rowErrors.add(error(row, TECHNICAL_SKILL_SHEET, "社員ID", "「社員」シートに存在しない社員IDです"));
            }
            if (!isBlank(levelRaw) && !TECHNICAL_LEVELS.contains(levelRaw) && !TECHNICAL_LEVELS.contains(level)) {
                rowErrors.add(error(row, TECHNICAL_SKILL_SHEET, "レベル", "レベルは ◎／〇／△ で入力してください"));
            }
            if (!isBlank(category) && !isBlank(itemName) && !TechnicalSkillCatalog.isValid(category, itemName)) {
                rowErrors.add(error(
                        row,
                        TECHNICAL_SKILL_SHEET,
                        "項目名",
                        "カテゴリ「" + category + "」に項目「" + itemName + "」はありません"
                ));
            }
            if (!rowErrors.isEmpty()) {
                addErrors(errors, rowErrors);
                continue;
            }
            byCode.computeIfAbsent(key, ignored -> new ArrayList<>())
                    .add(new TechnicalSkillDto(category.trim(), itemName.trim(), level));
        }
        return skipped;
    }

    private int collectCareers(
            ParsedSheet sheet,
            Set<String> employeeCodes,
            Map<String, List<CareerDto>> byCode,
            List<MasterImportRowErrorDto> errors
    ) {
        int skipped = 0;
        for (ParsedRow row : sheet.rows()) {
            if (row.isSample()) {
                skipped++;
                continue;
            }
            List<MasterImportRowErrorDto> rowErrors = new ArrayList<>();
            String code = required(row, CAREER_SHEET, "社員ID", rowErrors);
            String key = normalizeCodeKey(code);
            if (!isBlank(key) && !employeeCodes.contains(key)) {
                rowErrors.add(error(row, CAREER_SHEET, "社員ID", "「社員」シートに存在しない社員IDです"));
            }

            String startDate = optionalDate(row, CAREER_SHEET, "開始日", rowErrors);
            String endDate = optionalDate(row, CAREER_SHEET, "終了日", rowErrors);
            Integer months = optionalInteger(row, CAREER_SHEET, "月数", rowErrors);
            String period = blankToNull(text(row, "期間（表示用）"));
            String organization = blankToNull(text(row, "組織/案件名"));
            String workplace = blankToNull(text(row, "作業場所"));
            String role = blankToNull(text(row, "役割"));
            String roleOverview = blankToNull(text(row, "業務内容"));
            String osDb = blankToNull(text(row, "OS/DB"));
            String languages = blankToNull(text(row, "使用言語"));
            String fwTools = blankToNull(text(row, "FW/MW/ツール"));
            String phases = normalizeCareerPhases(text(row, "担当工程"), row, rowErrors);

            boolean hasPeriod = !isBlank(period) || !isBlank(startDate);
            boolean hasContent = !isBlank(organization) || !isBlank(roleOverview);
            if (rowErrors.isEmpty() && (!hasPeriod || !hasContent)) {
                rowErrors.add(error(
                        row,
                        CAREER_SHEET,
                        "業務内容",
                        "開始日または期間（表示用）と、組織/案件名または業務内容を記入してください"
                ));
            }
            if (!rowErrors.isEmpty()) {
                addErrors(errors, rowErrors);
                continue;
            }
            byCode.computeIfAbsent(key, ignored -> new ArrayList<>()).add(new CareerDto(
                    period,
                    organization == null ? "" : organization,
                    roleOverview == null ? "" : roleOverview,
                    startDate,
                    endDate,
                    months,
                    workplace,
                    role,
                    osDb,
                    languages,
                    fwTools,
                    phases
            ));
        }
        return skipped;
    }

    private static String normalizeCareerPhases(
            String raw,
            ParsedRow row,
            List<MasterImportRowErrorDto> errors
    ) {
        if (isBlank(raw)) {
            return null;
        }
        List<String> normalized = new ArrayList<>();
        for (String part : raw.split("[,、/｜|]")) {
            String phase = part.trim();
            if (phase.isEmpty()) {
                continue;
            }
            String mapped = CAREER_PHASE_ALIASES.getOrDefault(phase, phase);
            if (!CAREER_PHASES.contains(mapped)) {
                errors.add(error(row, CAREER_SHEET, "担当工程", "担当工程「" + phase + "」が不正です"));
                continue;
            }
            if (!normalized.contains(mapped)) {
                normalized.add(mapped);
            }
        }
        if (normalized.isEmpty()) {
            return null;
        }
        return String.join(",", normalized);
    }

    private static EmployeeSaveRequest withSkillDetails(
            EmployeeSaveRequest base,
            List<QualificationDto> qualifications,
            List<TechnicalSkillDto> technicalSkills,
            List<CareerDto> careers
    ) {
        return new EmployeeSaveRequest(
                base.employeeCode(),
                base.name(),
                base.departmentId(),
                base.affiliationCompany(),
                base.position(),
                base.assignmentRole(),
                base.employeeType(),
                base.workStatus(),
                base.unitPrice(),
                base.evaluation(),
                base.endDate(),
                base.personal(),
                base.skills(),
                technicalSkills,
                qualifications,
                careers,
                base.attendance(),
                base.evaluationHistory(),
                base.memo(),
                base.evaluationItems(),
                base.overallEvaluation(),
                base.salary(),
                base.hr()
        );
    }

    private static String normalizeCodeKey(String code) {
        if (isBlank(code)) {
            return "";
        }
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private record PendingEmployee(
            ParsedRow row,
            EmployeeSaveRequest request,
            List<MasterImportRowErrorDto> rowErrors
    ) {
    }

    @Transactional
    public MasterImportResultDto importClients(MultipartFile file, boolean dryRun) {
        requireAdmin();
        ParsedSheet sheet = parser.parse(file, CLIENT_SHEET, CLIENT_REQUIRED_HEADERS);
        List<MasterImportRowErrorDto> errors = new ArrayList<>();
        List<ClientSaveRequest> valid = new ArrayList<>();
        List<String> preview = new ArrayList<>();
        int skipped = 0;
        Set<String> namesInFile = new HashSet<>();

        for (ParsedRow row : sheet.rows()) {
            if (row.isSample()) {
                skipped++;
                continue;
            }
            List<MasterImportRowErrorDto> rowErrors = new ArrayList<>();
            ClientSaveRequest request = toClientRequest(row, namesInFile, rowErrors);
            if (!rowErrors.isEmpty()) {
                addErrors(errors, rowErrors);
                continue;
            }
            valid.add(request);
            if (preview.size() < PREVIEW_LIMIT) {
                preview.add(request.name());
            }
        }

        return finish("client", dryRun, sheet.rows().size(), skipped, valid.size(), errors, preview, () -> {
            for (ClientSaveRequest request : valid) {
                clientService.createFromMaster(request);
            }
            auditLogService.log(
                    AuditAction.MASTER_IMPORT,
                    "dispatch_client",
                    String.valueOf(valid.size()),
                    "取引先マスタ一括登録 新規" + valid.size() + "件"
            );
        });
    }

    private MasterImportResultDto finish(
            String target,
            boolean dryRun,
            int totalRows,
            int skipped,
            int validCount,
            List<MasterImportRowErrorDto> errors,
            List<String> preview,
            Runnable commit
    ) {
        int errorRows = (int) errors.stream()
                .map(error -> (error.sheet() == null ? "" : error.sheet()) + "#" + error.row())
                .distinct()
                .count();
        if (!errors.isEmpty()) {
            return new MasterImportResultDto(
                    dryRun, target, totalRows, skipped, validCount, errorRows, 0, preview, errors
            );
        }
        if (validCount == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "登録対象の行がありません");
        }
        if (dryRun) {
            return new MasterImportResultDto(
                    true, target, totalRows, skipped, validCount, 0, 0, preview, List.of()
            );
        }
        commit.run();
        return new MasterImportResultDto(
                false, target, totalRows, skipped, validCount, 0, validCount, preview, List.of()
        );
    }

    private EmployeeSaveRequest toEmployeeRequest(
            ParsedRow row,
            Lookup lookup,
            Set<String> codesInFile,
            Set<String> identitiesInFile,
            List<MasterImportRowErrorDto> errors
    ) {
        String name = required(row, "社員名", errors);
        String workStatus = requiredChoice(row, "稼働状況", MasterData.WORK_STATUSES, errors);
        String employeeType = requiredChoice(row, "社員種別", MasterData.EMPLOYEE_TYPES, errors);
        String affiliationCompanyRaw = required(row, "所属会社", errors);
        String affiliationCompany = null;
        if (!isBlank(affiliationCompanyRaw)) {
            if (!jp.dispatch.employee.model.AffiliationCompanies.isValid(affiliationCompanyRaw.trim())) {
                errors.add(error(row, "所属会社", "所属会社はビットクロス／アレシス／衆和テクノロジーのいずれかです"));
            } else {
                affiliationCompany = jp.dispatch.employee.model.AffiliationCompanies.normalize(affiliationCompanyRaw);
            }
        }

        String departmentName = required(row, "所属部門", errors);
        Long departmentId = null;
        if (!isBlank(departmentName) && affiliationCompany != null) {
            departmentId = lookup.departments.get(affiliationCompany + "\0" + departmentName);
            if (departmentId == null) {
                departmentId = lookup.departments.get(departmentName);
            }
        } else if (!isBlank(departmentName)) {
            departmentId = lookup.departments.get(departmentName);
        }
        if (!isBlank(departmentName) && departmentId == null) {
            String message = lookup.parentDepartments.contains(departmentName)
                    ? "事業部ではなく配下の部門を指定してください"
                    : "部門マスタに「" + departmentName + "」がありません";
            errors.add(error(row, "所属部門", message));
        } else if (!isBlank(employeeType) && !isBlank(departmentName) && affiliationCompany != null
                && !jp.dispatch.employee.model.EmployeeCodeRules.isDepartmentAllowedForType(
                        employeeType, departmentName, affiliationCompany)) {
            errors.add(error(row, "所属部門", "社員種別と所属部門の組み合わせが不正です"));
        }

        String code = required(row, "社員ID", errors);
        if (!isBlank(code)) {
            String normalized = code.trim();
            String codeError = jp.dispatch.employee.model.EmployeeCodeRules.validate(
                    normalized, employeeType, departmentName, affiliationCompany
            );
            if (codeError != null) {
                errors.add(error(row, "社員ID", codeError));
            }
            if (!codesInFile.add(normalized.toUpperCase(Locale.ROOT))) {
                errors.add(error(row, "社員ID", "ファイル内で社員IDが重複しています"));
            } else if (employeeRepository.codeExists(normalized, null)) {
                errors.add(error(row, "社員ID", "社員IDが既に登録されています"));
            }
        }

        String position = optionalChoice(row, "役職", MasterData.POSITIONS, errors);
        String roleLabel = text(row, "役割");
        String assignmentRole = null;
        if (!isBlank(roleLabel)) {
            assignmentRole = AssignmentRoleCodes.normalize(roleLabel);
            if (assignmentRole == null) {
                errors.add(error(row, "役割", "役割が不正です"));
            }
        }

        String endDate = optionalDate(row, "終了予定日", errors);
        if (!isBlank(endDate) && !isBlank(workStatus) && !END_DATE_STATUSES.contains(workStatus)) {
            endDate = null;
        }

        String gender = optionalChoice(row, "性別", GENDERS, errors);
        String birthDate = optionalDate(row, "生年月日", errors);
        String nationalityName = text(row, "国籍");
        NationalityDto nationality = lookup.nationalities.get(nationalityName);
        if (!isBlank(nationalityName) && nationality == null) {
            errors.add(error(row, "国籍", "国籍マスタに「" + nationalityName + "」がありません"));
        }
        boolean japan = nationality != null && nationality.isJapan();
        String residenceName = text(row, "在留資格");
        ResidenceStatusDto residence = lookup.residences.get(residenceName);
        if (!japan && !isBlank(residenceName) && residence == null) {
            errors.add(error(row, "在留資格", "在留資格マスタに「" + residenceName + "」がありません"));
        }
        String residenceCardNumber = japan ? "" : text(row, "在留カード番号");
        String residenceCardExpiry = japan ? "" : optionalDate(row, "在留カード有効期限", errors);
        String marital = optionalChoice(row, "結婚", MARITAL, errors);
        Integer itYears = optionalInteger(row, "IT業界経験年数", errors);
        String arrival = optionalDate(row, "来日年月", errors);
        String degree = optionalChoice(row, "学位", EDUCATION, errors);
        String japaneseLevel = optionalChoice(row, "日本語_会話レベル", CONVERSATION, errors);
        String japaneseReading = normalizeMark(optionalChoice(row, "日本語_仕様書解読", DOCUMENT_MARKS, errors));
        String japaneseWriting = normalizeMark(optionalChoice(row, "日本語_仕様書作成", DOCUMENT_MARKS, errors));
        String englishLevel = optionalChoice(row, "英語_会話レベル", CONVERSATION, errors);
        String englishReading = normalizeMark(optionalChoice(row, "英語_仕様書解読", DOCUMENT_MARKS, errors));
        String englishWriting = normalizeMark(optionalChoice(row, "英語_仕様書作成", DOCUMENT_MARKS, errors));

        if (!isBlank(name)) {
            String identityKey = String.join("|",
                    name.trim(),
                    gender == null ? "" : gender.trim(),
                    birthDate == null ? "" : birthDate.trim(),
                    arrival == null ? "" : arrival.trim()
            );
            if (!identitiesInFile.add(identityKey)) {
                errors.add(error(row, "社員名", "ファイル内で姓名・性別・生年月日・来日年月が重複しています"));
            } else if (employeeRepository.existsIdentityMatch(
                    name,
                    gender == null ? "" : gender,
                    birthDate == null ? "" : birthDate,
                    arrival == null ? "" : arrival,
                    null
            )) {
                errors.add(error(row, "社員名", "姓名・性別・生年月日・来日年月が一致する社員が既に登録されています"));
            }
        }

        PersonalDto personal = new PersonalDto(
                blankToNull(gender),
                blankToNull(birthDate),
                null,
                nationality == null ? null : nationality.id(),
                blankToNull(nationalityName),
                nationality == null ? null : nationality.isJapan(),
                japan || residence == null ? null : residence.id(),
                japan ? null : blankToNull(residenceName),
                blankToNull(residenceCardNumber),
                blankToNull(residenceCardExpiry),
                blankToNull(text(row, "電話番号")),
                blankToNull(text(row, "メール")),
                blankToNull(text(row, "住所")),
                null,
                blankToNull(text(row, "最寄駅")),
                null,
                blankToNull(text(row, "フリガナ")),
                blankToNull(marital),
                itYears,
                blankToNull(arrival),
                blankToNull(degree),
                blankToNull(text(row, "学校名")),
                blankToNull(text(row, "専攻学科")),
                blankToNull(japaneseLevel),
                null,
                blankToNull(japaneseReading),
                blankToNull(japaneseWriting),
                blankToNull(englishLevel),
                null,
                blankToNull(englishReading),
                blankToNull(englishWriting),
                null,
                blankToNull(text(row, "開発技術")),
                blankToNull(text(row, "業務知識")),
                blankToNull(text(row, "自己PR"))
        );

        return new EmployeeSaveRequest(
                blankToNull(code),
                name,
                departmentId,
                affiliationCompany,
                position,
                assignmentRole,
                employeeType,
                workStatus,
                0,
                null,
                blankToNull(endDate),
                personal,
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                null,
                null,
                null,
                List.of(),
                null,
                null,
                null
        );
    }

    private ClientSaveRequest toClientRequest(
            ParsedRow row,
            Set<String> namesInFile,
            List<MasterImportRowErrorDto> errors
    ) {
        String name = required(row, CLIENT_SHEET, "取引先名", errors);
        if (!isBlank(name)) {
            String key = name.trim();
            if (!namesInFile.add(key)) {
                errors.add(error(row, CLIENT_SHEET, "取引先名", "ファイル内で取引先名が重複しています"));
            } else if (clientRepository.existsActiveName(key)) {
                errors.add(error(row, CLIENT_SHEET, "取引先名", "取引先名が既に登録されています"));
            }
        }
        String rank = optionalChoice(row, CLIENT_SHEET, "重要度", ClientService.CLIENT_RANKS, errors);
        String status = text(row, "契約状況");
        if (isBlank(status)) {
            status = "商談中";
        } else if (!ClientService.CONTRACT_STATUSES.contains(status)) {
            errors.add(error(row, CLIENT_SHEET, "契約状況", "契約状況が不正です"));
        }
        String contractType = optionalChoice(row, CLIENT_SHEET, "契約形態", ClientService.CONTRACT_TYPES, errors);

        return new ClientSaveRequest(
                name,
                null,
                blankToNull(text(row, "郵便番号")),
                blankToNull(text(row, "住所")),
                blankToNull(text(row, "代表電話")),
                blankToNull(text(row, "FAX")),
                blankToNull(text(row, "会社URL")),
                blankToNull(text(row, "業種")),
                blankToNull(text(row, "代表者名")),
                blankToNull(text(row, "資本金")),
                blankToNull(text(row, "従業員数")),
                optionalDate(row, CLIENT_SHEET, "設立日", errors),
                optionalDate(row, CLIENT_SHEET, "取引開始日", errors),
                blankToNull(contractType),
                optionalDate(row, CLIENT_SHEET, "契約更新日", errors),
                optionalDate(row, CLIENT_SHEET, "契約満了日", errors),
                blankToNull(text(row, "支払サイト")),
                blankToNull(text(row, "支払方法")),
                blankToNull(text(row, "自社主担当")),
                blankToNull(text(row, "請求書送付先")),
                null,
                blankToNull(text(row, "経理担当者名")),
                blankToNull(text(row, "経理担当者所属")),
                blankToNull(text(row, "経理担当者電話")),
                blankToNull(text(row, "経理担当者メール")),
                blankToNull(text(row, "法人番号")),
                blankToNull(text(row, "与信メモ")),
                blankToNull(text(row, "取引上限")),
                blankToNull(rank),
                status,
                blankToNull(text(row, "備考")),
                List.of(),
                List.of()
        );
    }

    private Lookup buildLookup() {
        List<DepartmentDto> allDepartments = employeeRepository.findAllDepartments();
        List<DepartmentDto> assignable = DepartmentFilter.excludeParentDepartments(allDepartments);
        Map<String, Long> departments = new LinkedHashMap<>();
        for (DepartmentDto department : assignable) {
            String company = jp.dispatch.employee.model.AffiliationCompanies.normalize(department.company());
            departments.put(company + "\0" + department.name(), department.id());
            departments.putIfAbsent(department.name(), department.id());
        }
        Set<String> parentDepartments = new HashSet<>();
        Set<Long> assignableIds = new HashSet<>(departments.values());
        for (DepartmentDto department : allDepartments) {
            if (!assignableIds.contains(department.id())) {
                parentDepartments.add(department.name());
            }
        }
        Map<String, NationalityDto> nationalities = new LinkedHashMap<>();
        for (NationalityDto nationality : employeeRepository.findAllNationalities()) {
            nationalities.put(nationality.name(), nationality);
        }
        Map<String, ResidenceStatusDto> residences = new LinkedHashMap<>();
        for (ResidenceStatusDto status : employeeRepository.findAllResidenceStatuses()) {
            residences.put(status.name(), status);
        }
        return new Lookup(departments, parentDepartments, nationalities, residences);
    }

    private void requireAdmin() {
        if (!securityService.canManageMasterData()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "マスタ一括登録の権限がありません");
        }
    }

    private static String required(ParsedRow row, String field, List<MasterImportRowErrorDto> errors) {
        return required(row, EMPLOYEE_SHEET, field, errors);
    }

    private static String required(
            ParsedRow row,
            String sheet,
            String field,
            List<MasterImportRowErrorDto> errors
    ) {
        String value = text(row, field);
        if (isBlank(value)) {
            errors.add(error(row, sheet, field, field + "は必須です"));
        }
        return value;
    }

    private static String requiredChoice(
            ParsedRow row,
            String field,
            List<String> allowed,
            List<MasterImportRowErrorDto> errors
    ) {
        String value = required(row, field, errors);
        if (!isBlank(value) && !allowed.contains(value)) {
            errors.add(error(row, field, field + "が不正です"));
        }
        return value;
    }

    private static String optionalChoice(
            ParsedRow row,
            String field,
            List<String> allowed,
            List<MasterImportRowErrorDto> errors
    ) {
        return optionalChoice(row, EMPLOYEE_SHEET, field, Set.copyOf(allowed), errors);
    }

    private static String optionalChoice(
            ParsedRow row,
            String sheet,
            String field,
            List<String> allowed,
            List<MasterImportRowErrorDto> errors
    ) {
        return optionalChoice(row, sheet, field, Set.copyOf(allowed), errors);
    }

    private static String optionalChoice(
            ParsedRow row,
            String field,
            Set<String> allowed,
            List<MasterImportRowErrorDto> errors
    ) {
        return optionalChoice(row, EMPLOYEE_SHEET, field, allowed, errors);
    }

    private static String optionalChoice(
            ParsedRow row,
            String sheet,
            String field,
            Set<String> allowed,
            List<MasterImportRowErrorDto> errors
    ) {
        String value = text(row, field);
        if (isBlank(value)) {
            return "";
        }
        if (allowed.contains(value) || allowed.contains(value.toUpperCase(Locale.ROOT))) {
            return allowed.contains(value) ? value : value.toUpperCase(Locale.ROOT);
        }
        errors.add(error(row, sheet, field, field + "が不正です"));
        return value;
    }

    private static String optionalDate(ParsedRow row, String field, List<MasterImportRowErrorDto> errors) {
        return optionalDate(row, EMPLOYEE_SHEET, field, errors);
    }

    private static String optionalDate(
            ParsedRow row,
            String sheet,
            String field,
            List<MasterImportRowErrorDto> errors
    ) {
        String value = text(row, field);
        if (isBlank(value)) {
            return null;
        }
        String normalized = value.replace('/', '-').replace('.', '-');
        if (normalized.matches("\\d{4}-\\d{1,2}-\\d{1,2}")) {
            String[] parts = normalized.split("-");
            normalized = String.format("%s-%02d-%02d", parts[0], Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
        }
        try {
            LocalDate.parse(normalized);
            return normalized;
        } catch (DateTimeParseException e) {
            errors.add(error(row, sheet, field, "日付は YYYY-MM-DD で入力してください"));
            return null;
        }
    }

    private static Integer optionalInteger(ParsedRow row, String field, List<MasterImportRowErrorDto> errors) {
        return optionalInteger(row, EMPLOYEE_SHEET, field, errors);
    }

    private static Integer optionalInteger(
            ParsedRow row,
            String sheet,
            String field,
            List<MasterImportRowErrorDto> errors
    ) {
        String value = text(row, field);
        if (isBlank(value)) {
            return null;
        }
        try {
            double parsed = Double.parseDouble(value.replace(",", ""));
            if (parsed < 0 || parsed != Math.floor(parsed)) {
                errors.add(error(row, sheet, field, field + "は0以上の整数で入力してください"));
                return null;
            }
            return (int) parsed;
        } catch (NumberFormatException e) {
            errors.add(error(row, sheet, field, field + "は0以上の整数で入力してください"));
            return null;
        }
    }

    private static String text(ParsedRow row, String field) {
        return row.get(field);
    }

    private static String normalizeMark(String value) {
        if ("○".equals(value) || "◯".equals(value)) {
            return "〇";
        }
        return value;
    }

    private static void addErrors(List<MasterImportRowErrorDto> all, List<MasterImportRowErrorDto> rowErrors) {
        for (MasterImportRowErrorDto error : rowErrors) {
            if (all.size() >= MAX_ERRORS) {
                return;
            }
            all.add(error);
        }
    }

    private static MasterImportRowErrorDto error(ParsedRow row, String field, String message) {
        return error(row, EMPLOYEE_SHEET, field, message);
    }

    private static MasterImportRowErrorDto error(ParsedRow row, String sheet, String field, String message) {
        return new MasterImportRowErrorDto(row.excelRowNumber(), sheet, field, message);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private record Lookup(
            Map<String, Long> departments,
            Set<String> parentDepartments,
            Map<String, NationalityDto> nationalities,
            Map<String, ResidenceStatusDto> residences
    ) {
    }
}
