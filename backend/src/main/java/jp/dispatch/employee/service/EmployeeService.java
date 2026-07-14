package jp.dispatch.employee.service;

import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.DataScopeService;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.*;
import jp.dispatch.employee.dto.EmployeeDetailDto.AttendanceDto;
import jp.dispatch.employee.model.EvaluationCalculator.CalculationResult;
import jp.dispatch.employee.model.AssignmentRoleCodes;
import jp.dispatch.employee.model.MasterData;
import jp.dispatch.employee.model.SummaryFilter;
import jp.dispatch.employee.repository.EmployeeDetailRepository;
import jp.dispatch.employee.repository.EmployeeRepository;
import jp.dispatch.employee.repository.FileAttachmentRepository;
import jp.dispatch.employee.repository.RelatedDataCleanupRepository;
import jp.dispatch.employee.service.HrOpsPayrollMailService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@Service
public class EmployeeService {

    private final EmployeeRepository repository;
    private final EmployeeDetailRepository detailRepository;
    private final FileAttachmentRepository fileAttachmentRepository;
    private final RelatedDataCleanupRepository relatedDataCleanupRepository;
    private final EvaluationCalculationService calculationService;
    private final SecurityService securityService;
    private final DataScopeService dataScopeService;
    private final AuditLogService auditLogService;

    public EmployeeService(
            EmployeeRepository repository,
            EmployeeDetailRepository detailRepository,
            FileAttachmentRepository fileAttachmentRepository,
            RelatedDataCleanupRepository relatedDataCleanupRepository,
            EvaluationCalculationService calculationService,
            SecurityService securityService,
            DataScopeService dataScopeService,
            AuditLogService auditLogService
    ) {
        this.repository = repository;
        this.detailRepository = detailRepository;
        this.fileAttachmentRepository = fileAttachmentRepository;
        this.relatedDataCleanupRepository = relatedDataCleanupRepository;
        this.calculationService = calculationService;
        this.securityService = securityService;
        this.dataScopeService = dataScopeService;
        this.auditLogService = auditLogService;
    }

    public SummaryDto getSummary() {
        return repository.fetchSummary(dataScopeService.visibleDepartmentIdsOrNull());
    }

    public MasterDto getMaster() {
        List<DepartmentDto> allDepartments = repository.findAllDepartments();
        return new MasterDto(
                dataScopeService.visibleDepartments(allDepartments),
                DepartmentFilter.excludeParentDepartments(
                        dataScopeService.assignableDepartments(allDepartments)
                ),
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
            String summaryFilter,
            String skillKeyword,
            String technicalCategory,
            String technicalItem,
            String technicalMinLevel,
            String employeeType,
            String workStatus
    ) {
        if (summaryFilter != null && !summaryFilter.isBlank() && !SummaryFilter.isValid(summaryFilter)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "サマリーフィルターが不正です");
        }
        validateSearchOption(employeeType, MasterData.EMPLOYEE_TYPES, "社員種別");
        validateSearchOption(workStatus, MasterData.WORK_STATUSES, "稼働状況");
        dataScopeService.ensureSearchDepartmentAllowed(departmentId);
        List<EmployeeDto> employees = repository.search(
                keyword,
                employeeCode,
                name,
                departmentId,
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
        EmployeeDto employee = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません"));
        dataScopeService.ensureEmployeeAccessible(employee.departmentId());
        return calculationService.calculate(id)
                .map(calc -> withCalculatedEvaluation(employee, calc))
                .orElse(employee);
    }

    public EmployeeDetailDto getDetail(long id) {
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
        requireWritePermission();
        String employeeCode = repository.generateNextEmployeeCode();
        EmployeeRequest req = toEmployeeRequest(request, employeeCode);
        validate(req, null, true);
        ensureDepartmentAssignable(req.departmentId());
        long id = repository.insert(req);
        detailRepository.saveDetail(id, applySalaryWritePermission(request, null));
        calculationService.syncEvaluation(id);
        auditLogService.log(AuditAction.EMPLOYEE_CREATE, "employee", String.valueOf(id), req.name());
        return getById(id);
    }

    /** 履歴書インポート用：社員種別・所属部門・稼働状況なしで下書き登録し、編集画面で必須項目を入力させる */
    public EmployeeDto createFromImport(EmployeeSaveRequest request) {
        requireWritePermission();
        String employeeCode = repository.generateNextEmployeeCode();
        EmployeeRequest req = toEmployeeRequest(request, employeeCode);
        validate(req, null, false);
        if (hasDepartment(req.departmentId())) {
            ensureDepartmentAssignable(req.departmentId());
        }
        long id = repository.insert(req);
        detailRepository.saveDetail(id, applySalaryWritePermission(request, null));
        calculationService.syncEvaluation(id);
        auditLogService.log(AuditAction.EMPLOYEE_CREATE, "employee", String.valueOf(id), req.name());
        return getById(id);
    }

    public String getNextEmployeeCode() {
        requireWritePermission();
        return repository.generateNextEmployeeCode();
    }

    public EmployeeDto update(long id, EmployeeSaveRequest request) {
        requireWritePermission();
        EmployeeDto existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "社員が見つかりません"));
        dataScopeService.ensureEmployeeAccessible(existing.departmentId());
        validate(request.toEmployeeRequest(), id, true);
        ensureDepartmentAssignable(request.toEmployeeRequest().departmentId());
        repository.update(id, request.toEmployeeRequest());
        detailRepository.saveDetail(id, applySalaryWritePermission(request, id));
        calculationService.syncEvaluation(id);
        auditLogService.log(AuditAction.EMPLOYEE_UPDATE, "employee", String.valueOf(id), existing.name());
        return getById(id);
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
