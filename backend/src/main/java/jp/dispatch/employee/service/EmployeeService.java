package jp.dispatch.employee.service;

import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.DataScopeService;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.*;
import jp.dispatch.employee.dto.EmployeeDetailDto.AttendanceDto;
import jp.dispatch.employee.dto.EmployeeDetailDto.PersonalDto;
import jp.dispatch.employee.model.EvaluationCalculator.CalculationResult;
import jp.dispatch.employee.model.AffiliationCompanies;
import jp.dispatch.employee.model.AssignmentRoleCodes;
import jp.dispatch.employee.model.EmployeeCodeRules;
import jp.dispatch.employee.model.MasterData;
import jp.dispatch.employee.model.SummaryFilter;
import jp.dispatch.employee.repository.EmployeeDetailRepository;
import jp.dispatch.employee.repository.EmployeeRepository;
import jp.dispatch.employee.repository.FileAttachmentRepository;
import jp.dispatch.employee.repository.RelatedDataCleanupRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class EmployeeService {

    private static final ZoneId TOKYO = ZoneId.of("Asia/Tokyo");
    private static final Set<String> RESIGNATION_WORK_STATUSES = Set.of("退職予定", "退職");

    private final EmployeeRepository repository;
    private final EmployeeDetailRepository detailRepository;
    private final FileAttachmentRepository fileAttachmentRepository;
    private final RelatedDataCleanupRepository relatedDataCleanupRepository;
    private final EvaluationCalculationService calculationService;
    private final SecurityService securityService;
    private final DataScopeService dataScopeService;
    private final AuditLogService auditLogService;
    private final ResumeExcelExportService resumeExcelExportService;
    private final PaidLeaveBalanceService paidLeaveBalanceService;

    public EmployeeService(
            EmployeeRepository repository,
            EmployeeDetailRepository detailRepository,
            FileAttachmentRepository fileAttachmentRepository,
            RelatedDataCleanupRepository relatedDataCleanupRepository,
            EvaluationCalculationService calculationService,
            SecurityService securityService,
            DataScopeService dataScopeService,
            AuditLogService auditLogService,
            ResumeExcelExportService resumeExcelExportService,
            PaidLeaveBalanceService paidLeaveBalanceService
    ) {
        this.repository = repository;
        this.detailRepository = detailRepository;
        this.fileAttachmentRepository = fileAttachmentRepository;
        this.relatedDataCleanupRepository = relatedDataCleanupRepository;
        this.calculationService = calculationService;
        this.securityService = securityService;
        this.dataScopeService = dataScopeService;
        this.auditLogService = auditLogService;
        this.resumeExcelExportService = resumeExcelExportService;
        this.paidLeaveBalanceService = paidLeaveBalanceService;
    }

    public SummaryDto getSummary() {
        requireEmployeeDirectoryAccess();
        return repository.fetchSummary(dataScopeService.visibleDepartmentIdsOrNull());
    }

    public MasterDto getMaster() {
        requireEmployeeDirectoryAccess();
        List<DepartmentDto> allDepartments = repository.findAllDepartments();
        return new MasterDto(
                dataScopeService.visibleDepartments(allDepartments),
                DepartmentFilter.excludeParentDepartments(
                        dataScopeService.assignableDepartments(allDepartments)
                ),
                AffiliationCompanies.ALL,
                MasterData.POSITIONS,
                MasterData.ASSIGNMENT_ROLES,
                MasterData.EMPLOYEE_TYPES,
                MasterData.WORK_STATUSES,
                MasterData.allEvaluations(),
                repository.findAllNationalities(),
                repository.findAllResidenceStatuses()
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
            String workStatus
    ) {
        requireEmployeeDirectoryAccess();
        if (summaryFilter != null && !summaryFilter.isBlank() && !SummaryFilter.isValid(summaryFilter)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "サマリーフィルターが不正です");
        }
        validateSearchOption(employeeType, MasterData.EMPLOYEE_TYPES, "社員種別");
        validateSearchOption(workStatus, MasterData.WORK_STATUSES, "稼働状況");
        if (affiliationCompany != null && !affiliationCompany.isBlank()
                && !AffiliationCompanies.isValid(affiliationCompany.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属会社が不正です");
        }
        dataScopeService.ensureSearchDepartmentAllowed(departmentId);
        List<EmployeeDto> employees = repository.search(
                keyword,
                employeeCode,
                name,
                departmentId,
                blankToNull(affiliationCompany),
                summaryFilter,
                skillKeyword,
                technicalCategory,
                technicalItem,
                technicalMinLevel,
                employeeType,
                workStatus,
                dataScopeService.visibleDepartmentIdsOrNull()
        );
        Map<Long, CalculationResult> calculations = calculationService.calculateAll();
        return employees.stream()
                .map(emp -> applyCalculation(emp, calculations.get(emp.id())))
                .map(this::applyListSalaryVisibility)
                .toList();
    }

    public EmployeeDto getById(long id) {
        requireEmployeeDirectoryAccess();
        EmployeeDto employee = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません"));
        dataScopeService.ensureEmployeeAccessible(employee.departmentId());
        return calculationService.calculate(id)
                .map(calc -> withCalculatedEvaluation(employee, calc))
                .orElse(employee);
    }

    public EmployeeDetailDto getDetail(long id) {
        requireEmployeeDirectoryAccess();
        detailRepository.findDetail(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません"));

        calculationService.syncEvaluation(id);

        EmployeeDetailDto baseDetail = detailRepository.findDetail(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません"));

        dataScopeService.ensureEmployeeAccessible(baseDetail.departmentId());

        EmployeeDetailDto detail = calculationService.calculateDto(id)
                .map(calc -> withCalculationDetail(baseDetail, calc))
                .orElse(baseDetail);

        return applyDetailSalaryVisibility(detail);
    }

    public ResumeExcelExportService.ResumeExcelFile exportResumeExcel(long id) {
        EmployeeDetailDto detail = getDetail(id);
        return resumeExcelExportService.export(detail);
    }

    public List<String> getAttendanceMonths(long id) {
        ensureEmployeeAccessible(id);
        var months = new LinkedHashSet<>(detailRepository.listAttendanceMonths(id));
        LocalDate cursor = LocalDate.now().withDayOfMonth(1);
        for (int i = 0; i < 12; i += 1) {
            months.add(cursor.format(DateTimeFormatter.ofPattern("yyyy-MM")));
            cursor = cursor.minusMonths(1);
        }
        return months.stream().sorted(Comparator.reverseOrder()).toList();
    }

    public AttendanceDto getAttendanceForMonth(long id, String targetMonth) {
        ensureEmployeeAccessible(id);
        if (targetMonth == null || !targetMonth.matches("\\d{4}-\\d{2}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "対象月（YYYY-MM）を指定してください");
        }
        return detailRepository.findAttendanceForMonth(id, targetMonth).orElse(null);
    }

    public List<EmployeePayrollSlipDto> getPayrollSlips(long id) {
        requireViewSalary();
        EmployeeDto employee = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません"));
        dataScopeService.ensureEmployeeAccessible(employee.departmentId());

        List<EmployeePayrollSlipDto> linked = fileAttachmentRepository.findPayrollSlipsByEmployeeId(id);
        var merged = new LinkedHashMap<Long, EmployeePayrollSlipDto>();
        linked.forEach(slip -> merged.put(slip.fileId(), slip));
        fileAttachmentRepository.findAllPayroll().stream()
                .filter(file -> HrOpsPayrollMailService.payrollFileMatchesEmployee(
                        file,
                        id,
                        employee.employeeCode(),
                        employee.name()
                ))
                .map(file -> new EmployeePayrollSlipDto(
                        file.id(),
                        file.originalName(),
                        file.targetMonth(),
                        file.createdAt(),
                        file.uploadedByName()
                ))
                .forEach(slip -> merged.putIfAbsent(slip.fileId(), slip));
        return merged.values().stream()
                .sorted(Comparator
                        .comparing(EmployeePayrollSlipDto::targetMonth, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(EmployeePayrollSlipDto::fileId, Comparator.reverseOrder()))
                .toList();
    }

    private void ensureEmployeeAccessible(long id) {
        EmployeeDto employee = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません"));
        dataScopeService.ensureEmployeeAccessible(employee.departmentId());
    }

    private void requireEmployeeDirectoryAccess() {
        if (!securityService.canViewEmployeeDirectory()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "社員情報の閲覧権限がありません");
        }
    }

    private void requireViewSalary() {
        if (!securityService.canViewSalary()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "給与情報の閲覧権限がありません");
        }
    }

    public void delete(long id) {
        requireDeletePermission();
        EmployeeDto existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません"));
        dataScopeService.ensureEmployeeAccessible(existing.departmentId());
        relatedDataCleanupRepository.deleteEmployeeRelations(id);
        if (!detailRepository.deleteEmployee(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません");
        }
        auditLogService.log(AuditAction.EMPLOYEE_DELETE, "employee", String.valueOf(id), existing.name());
    }

    public EmployeeDto create(EmployeeSaveRequest request) {
        return insertEmployee(request, true);
    }

    /** マスタ一括登録：件ごとの監査は記録しない */
    public EmployeeDto createFromMaster(EmployeeSaveRequest request) {
        return insertEmployee(request, false);
    }

    private EmployeeDto insertEmployee(EmployeeSaveRequest request, boolean writeAudit) {
        requireWritePermission();
        EmployeeSaveRequest normalized = applySalaryWritePermission(request, null);
        normalized = applyResignationAndWorkStatusRules(normalized, null, null);
        String employeeCode = EmployeeCodeRules.normalizeCode(normalized.employeeCode());
        EmployeeRequest req = toEmployeeRequest(normalized, employeeCode);
        validateNewEmployee(req, normalized.personal(), null);
        ensureDepartmentAssignable(req.departmentId());
        long id = repository.insert(req);
        detailRepository.saveDetail(id, normalized);
        calculationService.syncEvaluation(id);
        if (PaidLeaveBalanceService.isResignedWorkStatus(req.workStatus())) {
            paidLeaveBalanceService.clearBalanceOnResignation(id);
        } else {
            paidLeaveBalanceService.reinitializeFromHireDate(id);
        }
        if (writeAudit) {
            auditLogService.log(AuditAction.EMPLOYEE_CREATE, "employee", String.valueOf(id), req.name());
        }
        return getById(id);
    }

    /**
     * 退社日は管理者・人事のみ変更可。退社日がある場合は日付に応じて稼働状況を自動設定する。
     * 退職予定/退職の手動設定・変更も管理者・人事のみ。
     */
    private EmployeeSaveRequest applyResignationAndWorkStatusRules(
            EmployeeSaveRequest request,
            Long employeeId,
            String previousWorkStatus
    ) {
        EmployeeDetailDto.HrDto existingHr = null;
        if (employeeId != null) {
            existingHr = detailRepository.findDetail(employeeId)
                    .map(EmployeeDetailDto::hr)
                    .orElse(null);
        }
        String existingResignation = existingHr == null ? null : blankToNull(existingHr.resignationDate());
        EmployeeDetailDto.HrDto requestedHr = request.hr();
        String requestedResignation = requestedHr == null ? null : blankToNull(requestedHr.resignationDate());

        boolean canEditResignation = securityService.canEditResignationDate();
        if (!canEditResignation
                && !Objects.equals(nullToEmpty(existingResignation), nullToEmpty(requestedResignation))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "退社日は人事または管理者のみ変更できます");
        }

        String nextResignation = canEditResignation ? requestedResignation : existingResignation;
        EmployeeDetailDto.HrDto baseHr = requestedHr != null ? requestedHr : existingHr;
        EmployeeDetailDto.HrDto nextHr = withResignationDate(baseHr, nextResignation);

        String previous = nullToEmpty(previousWorkStatus);
        String requestedStatus = nullToEmpty(request.workStatus());
        if (!canEditResignation) {
            if (RESIGNATION_WORK_STATUSES.contains(previous) && !previous.equals(requestedStatus)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "退職予定・退職の稼働状況は人事または管理者のみ変更できます"
                );
            }
            if (RESIGNATION_WORK_STATUSES.contains(requestedStatus)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "退職予定・退職は人事または管理者のみ設定できます"
                );
            }
        }

        String nextStatus = requestedStatus;
        if (canEditResignation && nextResignation != null) {
            nextStatus = workStatusFromResignationDate(nextResignation);
        }
        if (nextStatus.isBlank()) {
            nextStatus = request.workStatus();
        }

        return request.withWorkStatusAndHr(nextStatus, nextHr);
    }

    private static String workStatusFromResignationDate(String resignationDate) {
        LocalDate today = LocalDate.now(TOKYO);
        LocalDate date = LocalDate.parse(resignationDate);
        return date.isAfter(today) ? "退職予定" : "退職";
    }

    private static EmployeeDetailDto.HrDto withResignationDate(EmployeeDetailDto.HrDto source, String resignationDate) {
        if (source == null) {
            if (resignationDate == null) {
                return null;
            }
            return new EmployeeDetailDto.HrDto(
                    null,
                    resignationDate,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null
            );
        }
        return new EmployeeDetailDto.HrDto(
                source.hireDate(),
                resignationDate,
                source.contractStartDate(),
                source.contractEndDate(),
                source.socialInsuranceStatus(),
                source.employmentInsuranceNo(),
                source.pensionNo(),
                source.emergencyContactName(),
                source.emergencyContactPhone(),
                source.emergencyContactRelation(),
                source.paidLeaveStartDate()
        );
    }

    /**
     * 履歴書インポート：社員ID・社員種別・所属部門は事前必須。
     * 稼働状況が空の場合は待機中を既定とする。
     */
    public EmployeeDto createFromImport(EmployeeSaveRequest request) {
        requireWritePermission();
        String workStatus = request.workStatus();
        if (workStatus == null || workStatus.isBlank()) {
            workStatus = "待機中";
        }
        EmployeeSaveRequest normalized = new EmployeeSaveRequest(
                request.employeeCode(),
                request.name(),
                request.departmentId(),
                request.affiliationCompany(),
                request.position(),
                request.assignmentRole(),
                request.employeeType(),
                workStatus,
                request.unitPrice(),
                request.evaluation(),
                request.endDate(),
                request.personal(),
                request.skills(),
                request.technicalSkills(),
                request.qualifications(),
                request.careers(),
                request.attendance(),
                request.evaluationHistory(),
                request.memo(),
                request.evaluationItems(),
                request.overallEvaluation(),
                request.salary(),
                request.hr()
        );
        return insertEmployee(normalized, true);
    }

    /** 社員IDが既に登録済みか */
    public EmployeeCodeExistsDto employeeCodeExists(String code) {
        requireWritePermission();
        String normalized = EmployeeCodeRules.normalizeCode(code);
        if (normalized.isEmpty()) {
            return new EmployeeCodeExistsDto(false);
        }
        return new EmployeeCodeExistsDto(repository.codeExists(normalized, null));
    }

    /** 欠番優先の推奨社員ID（所属会社・部門・種別確定後） */
    public NextEmployeeCodeDto recommendEmployeeCode(
            String employeeType,
            Long departmentId,
            String affiliationCompany
    ) {
        requireWritePermission();
        Character letter = EmployeeCodeRules.typeLetter(employeeType);
        if (letter == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "社員種別を指定してください");
        }
        String company = AffiliationCompanies.normalize(affiliationCompany);
        String departmentName = repository.findDepartmentNameById(departmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属部門を指定してください"));
        ensureDepartmentMatchesCompany(departmentId, company);
        if (!EmployeeCodeRules.isDepartmentAllowedForType(employeeType, departmentName, company)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "社員種別と所属部門の組み合わせが不正です");
        }
        String prefix = EmployeeCodeRules.requiredPrefix(company);
        String head = EmployeeCodeRules.codePrefixForLookup(prefix, letter);
        List<Integer> used = repository.findUsedSerials(head);
        Set<Integer> usedSet = new HashSet<>(used);
        int recommended = 1;
        while (recommended <= 99999 && usedSet.contains(recommended)) {
            recommended++;
        }
        if (recommended > 99999) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "この種別の社員ID枠が上限に達しています");
        }
        String latest = used.isEmpty()
                ? null
                : EmployeeCodeRules.buildCode(prefix, letter, used.stream().max(Integer::compareTo).orElse(0));
        return new NextEmployeeCodeDto(
                EmployeeCodeRules.buildCode(prefix, letter, recommended),
                latest,
                prefix,
                String.valueOf(letter)
        );
    }

    /** @deprecated 互換用。recommendEmployeeCode を使用 */
    @Deprecated
    public String getNextEmployeeCode() {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "社員IDは手動入力です。employeeType と departmentId を指定して /employee-code/recommend を利用してください"
        );
    }

    public EmployeeDto update(long id, EmployeeSaveRequest request) {
        requireWritePermission();
        EmployeeDto existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません"));
        dataScopeService.ensureEmployeeAccessible(existing.departmentId());

        String previousHireDate = detailRepository.findDetail(id)
                .map(EmployeeDetailDto::hr)
                .map(EmployeeDetailDto.HrDto::hireDate)
                .orElse(null);
        String previousEmployeeType = existing.employeeType();

        EmployeeSaveRequest locked = applyUpdateLocks(existing, request);
        locked = applySalaryWritePermission(locked, id);
        locked = applyResignationAndWorkStatusRules(locked, id, existing.workStatus());
        EmployeeRequest req = locked.toEmployeeRequest();
        validateUpdateEmployee(existing, req, locked.personal());
        ensureDepartmentAssignable(req.departmentId());
        repository.update(id, req);
        detailRepository.saveDetail(id, locked);
        calculationService.syncEvaluation(id);

        String nextHireDate = locked.hr() != null ? locked.hr().hireDate() : null;
        String nextEmployeeType = req.employeeType();
        String nextWorkStatus = req.workStatus();
        boolean hireDateChanged = !Objects.equals(
                normalizeHireDateKey(previousHireDate),
                normalizeHireDateKey(nextHireDate)
        );
        boolean paidLeaveEligibilityChanged = PaidLeaveBalanceService.isEligibleEmployeeType(previousEmployeeType)
                != PaidLeaveBalanceService.isEligibleEmployeeType(nextEmployeeType);
        boolean becameResigned = PaidLeaveBalanceService.isResignedWorkStatus(nextWorkStatus);
        boolean leftResigned = PaidLeaveBalanceService.isResignedWorkStatus(existing.workStatus())
                && !becameResigned;
        if (becameResigned) {
            // 退職：有給台帳削除。退職予定は残す。
            paidLeaveBalanceService.clearBalanceOnResignation(id);
        } else if (hireDateChanged || paidLeaveEligibilityChanged || leftResigned) {
            paidLeaveBalanceService.reinitializeFromHireDate(id);
        }

        auditLogService.log(AuditAction.EMPLOYEE_UPDATE, "employee", String.valueOf(id), existing.name());
        return getById(id);
    }

    private static String normalizeHireDateKey(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return raw.trim().replace('/', '-');
    }

    private EmployeeSaveRequest applyUpdateLocks(EmployeeDto existing, EmployeeSaveRequest request) {
        String employeeType = existing.employeeType();
        Long departmentId = existing.departmentId();
        String assignmentRole = existing.assignmentRole();
        String position = existing.position();

        boolean canChangeDeptRole = securityService.canChangeEmployeeDepartmentAndRole();
        if (canChangeDeptRole && EmployeeCodeRules.canChangeDepartment(employeeType)) {
            departmentId = request.departmentId();
            assignmentRole = request.assignmentRole();
            position = request.position();
        } else if (canChangeDeptRole) {
            // 個人事業主/BP：部門変更不可、役職・役割のみ変更可
            assignmentRole = request.assignmentRole();
            position = request.position();
        }

        return new EmployeeSaveRequest(
                existing.employeeCode(),
                request.name(),
                departmentId,
                existing.affiliationCompany(),
                position,
                assignmentRole,
                employeeType,
                request.workStatus(),
                request.unitPrice(),
                request.evaluation(),
                request.endDate(),
                request.personal(),
                request.skills(),
                request.technicalSkills(),
                request.qualifications(),
                request.careers(),
                request.attendance(),
                request.evaluationHistory(),
                request.memo(),
                request.evaluationItems(),
                request.overallEvaluation(),
                request.salary(),
                request.hr()
        );
    }

    private void validateNewEmployee(EmployeeRequest req, PersonalDto personal, Long excludeId) {
        validateNormalized(req, excludeId, true);
        String company = AffiliationCompanies.normalize(req.affiliationCompany());
        ensureDepartmentMatchesCompany(req.departmentId(), company);
        String departmentName = resolveDepartmentName(req.departmentId());
        String codeError = EmployeeCodeRules.validate(
                req.employeeCode(), req.employeeType(), departmentName, company
        );
        if (codeError != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, codeError);
        }
        assertNoIdentityDuplicate(req.name(), personal, excludeId);
    }

    private void validateUpdateEmployee(EmployeeDto existing, EmployeeRequest req, PersonalDto personal) {
        validateNormalized(req, existing.id(), true);
        String company = AffiliationCompanies.normalize(
                existing.affiliationCompany() != null ? existing.affiliationCompany() : req.affiliationCompany()
        );
        ensureDepartmentMatchesCompany(req.departmentId(), company);
        String newDeptName = resolveDepartmentName(req.departmentId());
        if (EmployeeCodeRules.isCrossCompanyTransfer(existing.affiliationCompany(), company)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属会社は変更できません");
        }
        if (!EmployeeCodeRules.isDepartmentAllowedForType(req.employeeType(), newDeptName, company)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "社員種別と所属部門の組み合わせが不正です");
        }
        // 社員IDは変更不可。新形式の場合のみ、部門変更後もプレフィックス整合を確認する
        if (EmployeeCodeRules.matchesFormat(existing.employeeCode())) {
            String codeError = EmployeeCodeRules.validate(
                    existing.employeeCode(), req.employeeType(), newDeptName, company
            );
            if (codeError != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, codeError);
            }
        }
        assertNoIdentityDuplicate(req.name(), personal, existing.id());
    }

    private void ensureDepartmentMatchesCompany(Long departmentId, String affiliationCompany) {
        String deptCompany = repository.findDepartmentCompanyById(departmentId)
                .map(AffiliationCompanies::normalize)
                .orElse(null);
        if (deptCompany == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属部門が不正です");
        }
        if (!deptCompany.equals(AffiliationCompanies.normalize(affiliationCompany))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "所属部門は所属会社「" + AffiliationCompanies.normalize(affiliationCompany) + "」の部門を選択してください"
            );
        }
    }

    private void assertNoIdentityDuplicate(String name, PersonalDto personal, Long excludeId) {
        String gender = personal == null ? "" : nullToEmpty(personal.gender());
        String birthDate = personal == null ? "" : nullToEmpty(personal.birthDate());
        String arrival = personal == null ? "" : nullToEmpty(personal.japanArrivalDate());
        if (repository.existsIdentityMatch(name, gender, birthDate, arrival, excludeId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "姓名・性別・生年月日・来日年月が一致する社員が既に登録されています"
            );
        }
    }

    private String resolveDepartmentName(Long departmentId) {
        return repository.findDepartmentNameById(departmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属部門が不正です"));
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private EmployeeDto applyListSalaryVisibility(EmployeeDto employee) {
        if (securityService.canViewSalary()) {
            return employee;
        }
        return new EmployeeDto(
                employee.id(),
                employee.employeeCode(),
                employee.name(),
                employee.nameKana(),
                employee.departmentId(),
                employee.departmentName(),
                employee.affiliationCompany(),
                employee.position(),
                employee.assignmentRole(),
                employee.employeeType(),
                employee.workStatus(),
                0,
                employee.evaluation(),
                employee.endDate(),
                employee.evaluationCalculated()
        );
    }

    private EmployeeDetailDto applyDetailSalaryVisibility(EmployeeDetailDto detail) {
        if (securityService.canViewSalary()) {
            return detail;
        }
        return detail.withoutSalaryAndHr();
    }

    private EmployeeSaveRequest applySalaryWritePermission(EmployeeSaveRequest request, Long employeeId) {
        if (securityService.canWriteSalary()) {
            return request;
        }
        if (employeeId == null) {
            return request.withoutSalaryAndHr();
        }
        EmployeeDetailDto existing = detailRepository.findDetail(employeeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません"));
        return request.withSalaryAndHr(existing.salary(), existing.hr());
    }

    private void requireWritePermission() {
        if (!securityService.canWrite()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "編集権限がありません");
        }
    }

    private void requireDeletePermission() {
        if (!securityService.canDelete()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "削除権限がありません");
        }
    }

    private void ensureDepartmentAssignable(Long departmentId) {
        dataScopeService.ensureDepartmentAssignable(
                EmployeeFieldNormalizer.normalizeDepartmentId(departmentId)
        );
    }

    private EmployeeDto applyCalculation(EmployeeDto employee, CalculationResult calc) {
        if (calc == null) {
            return employee;
        }
        return withCalculatedEvaluation(employee, calc);
    }

    private EmployeeDto withCalculatedEvaluation(EmployeeDto employee, CalculationResult calc) {
        return new EmployeeDto(
                employee.id(),
                employee.employeeCode(),
                employee.name(),
                employee.nameKana(),
                employee.departmentId(),
                employee.departmentName(),
                employee.affiliationCompany(),
                employee.position(),
                employee.assignmentRole(),
                employee.employeeType(),
                employee.workStatus(),
                employee.unitPrice(),
                calc.evaluation(),
                employee.endDate(),
                true
        );
    }

    private EmployeeDetailDto withCalculationDetail(EmployeeDetailDto detail, EvaluationCalcDto calc) {
        return new EmployeeDetailDto(
                detail.id(),
                detail.employeeCode(),
                detail.name(),
                detail.departmentId(),
                detail.departmentName(),
                detail.affiliationCompany(),
                detail.position(),
                detail.assignmentRole(),
                detail.employeeType(),
                detail.workStatus(),
                detail.unitPrice(),
                detail.evaluation(),
                detail.endDate(),
                detail.personal(),
                detail.skills(),
                detail.technicalSkills(),
                detail.qualifications(),
                detail.careers(),
                detail.attendance(),
                detail.evaluationHistory(),
                detail.memo(),
                detail.evaluationCategories(),
                detail.overallEvaluation(),
                detail.salary(),
                detail.hr(),
                detail.monthlyExpenses(),
                calc,
                true
        );
    }

    private EmployeeRequest toEmployeeRequest(EmployeeSaveRequest request, String employeeCode) {
        EmployeeRequest normalized = request.toEmployeeRequest();
        return new EmployeeRequest(
                employeeCode,
                normalized.name(),
                normalized.departmentId(),
                normalized.affiliationCompany(),
                normalized.position(),
                normalized.assignmentRole(),
                normalized.employeeType(),
                normalized.workStatus(),
                normalized.unitPrice(),
                normalized.evaluation(),
                normalized.endDate()
        );
    }

    private void validate(EmployeeRequest req, Long excludeId, boolean requireCoreFields) {
        EmployeeRequest normalized = new EmployeeRequest(
                req.employeeCode(),
                req.name(),
                EmployeeFieldNormalizer.normalizeDepartmentId(req.departmentId()),
                AffiliationCompanies.normalize(req.affiliationCompany()),
                EmployeeFieldNormalizer.normalizeOptionalText(req.position()),
                AssignmentRoleCodes.normalize(req.assignmentRole()),
                EmployeeFieldNormalizer.normalizeOptionalText(req.employeeType()),
                EmployeeFieldNormalizer.normalizeOptionalText(req.workStatus()),
                req.unitPrice(),
                EmployeeFieldNormalizer.normalizeOptionalText(req.evaluation()),
                req.endDate()
        );
        validateNormalized(normalized, excludeId, requireCoreFields);
    }

    private void validateNormalized(EmployeeRequest req, Long excludeId, boolean requireCoreFields) {
        if (req.employeeCode() == null || req.employeeCode().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "社員IDは必須です");
        }
        if (req.name() == null || req.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "社員名は必須です");
        }
        if (repository.codeExists(req.employeeCode().trim(), excludeId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "社員IDが既に登録されています");
        }
        if (requireCoreFields) {
            validateCoreFieldsRequired(req);
        } else if (hasDepartment(req.departmentId()) && !repository.departmentExists(req.departmentId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属部門が不正です");
        }
        if (!isBlank(req.position()) && !MasterData.POSITIONS.contains(req.position())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "役職が不正です");
        }
        if (!requireCoreFields) {
            if (!isBlank(req.employeeType()) && !MasterData.EMPLOYEE_TYPES.contains(req.employeeType())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "社員種別が不正です");
            }
            if (!isBlank(req.workStatus()) && !MasterData.WORK_STATUSES.contains(req.workStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "稼働状況が不正です");
            }
        }
        if (!isBlank(req.evaluation()) && !MasterData.allEvaluations().contains(req.evaluation())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "評価が不正です");
        }
        if (req.unitPrice() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "単価は0以上で入力してください");
        }
    }

    private void validateCoreFieldsRequired(EmployeeRequest req) {
        if (isBlank(req.affiliationCompany()) || !AffiliationCompanies.isValid(req.affiliationCompany())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属会社は必須です");
        }
        if (!hasDepartment(req.departmentId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属部門は必須です");
        }
        if (!repository.departmentExists(req.departmentId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属部門が不正です");
        }
        if (isBlank(req.employeeType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "社員種別は必須です");
        }
        if (!MasterData.EMPLOYEE_TYPES.contains(req.employeeType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "社員種別が不正です");
        }
        if (isBlank(req.workStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "稼働状況は必須です");
        }
        if (!MasterData.WORK_STATUSES.contains(req.workStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "稼働状況が不正です");
        }
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private static void validateSearchOption(String value, List<String> allowed, String label) {
        if (!isBlank(value) && !allowed.contains(value.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + "が不正です");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static boolean hasDepartment(Long departmentId) {
        return departmentId != null && departmentId > 0;
    }
}
