package jp.dispatch.employee.auth;

import jp.dispatch.employee.dto.DepartmentDto;
import jp.dispatch.employee.model.AffiliationCompanies;
import jp.dispatch.employee.model.MasterData;
import jp.dispatch.employee.repository.EmployeeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 閲覧可能な部門・会社スコープを解決する。
 * 本職・兼職のスコープは和集合。
 * {@code null} = 制限なし、空リスト = 閲覧不可。
 */
@Service
public class DataScopeService {

    private final SecurityService securityService;
    private final EmployeeRepository employeeRepository;

    public DataScopeService(SecurityService securityService, EmployeeRepository employeeRepository) {
        this.securityService = securityService;
        this.employeeRepository = employeeRepository;
    }

    public List<Long> visibleDepartmentIdsOrNull() {
        AppUserDetails user = securityService.currentUser();
        if (user == null) {
            return List.of();
        }
        if (securityService.hasAnyRole(AuthRoles.ADMIN, AuthRoles.HR)) {
            return null;
        }
        List<UserAssignment> assignments = effectiveAssignments(user);
        if (assignments.isEmpty()) {
            return resolveLegacyDepartmentScope(user);
        }
        Set<Long> ids = new LinkedHashSet<>();
        boolean anyScopedRole = false;
        for (UserAssignment assignment : assignments) {
            List<Long> scope = resolveAssignmentVisibleDepartments(assignment);
            if (scope == null) {
                return null;
            }
            if (isScopedRole(assignment.role())) {
                anyScopedRole = true;
                ids.addAll(scope);
            }
        }
        if (!anyScopedRole) {
            return List.of();
        }
        return List.copyOf(ids);
    }

    public List<DepartmentDto> visibleDepartments(List<DepartmentDto> departments) {
        List<Long> scope = visibleDepartmentIdsOrNull();
        if (scope == null) {
            return departments;
        }
        return departments.stream()
                .filter(department -> scope.contains(department.id()))
                .toList();
    }

    /**
     * 営業のみの兼職がある場合の会社フィルタ。
     * 事業部長／部長兼職もある場合は部門スコープで足りるため {@code null}。
     * {@code null} = 会社条件なし、空 = 閲覧不可、非空 = IN 条件。
     */
    public List<String> visibleAffiliationCompaniesOrNull() {
        AppUserDetails user = securityService.currentUser();
        if (user == null) {
            return List.of();
        }
        if (securityService.hasAnyRole(AuthRoles.ADMIN, AuthRoles.HR)) {
            return null;
        }
        List<UserAssignment> assignments = effectiveAssignments(user);
        if (assignments.isEmpty()) {
            return resolveLegacyAffiliationCompanies(user);
        }
        List<String> salesCompanies = new ArrayList<>();
        boolean hasDeptScopeRole = false;
        for (UserAssignment assignment : assignments) {
            if (AuthRoles.DIVISION_HEAD.equals(assignment.role())
                    || AuthRoles.DEPT_HEAD.equals(assignment.role())) {
                hasDeptScopeRole = true;
            }
            if (AuthRoles.SALES_HEAD.equals(assignment.role())) {
                String company = normalizeRequiredCompany(assignment.affiliationCompany());
                if (company != null && !salesCompanies.contains(company)) {
                    salesCompanies.add(company);
                }
            }
        }
        if (salesCompanies.isEmpty() || hasDeptScopeRole) {
            return null;
        }
        return List.copyOf(salesCompanies);
    }

    /** 互換：単一会社が必要な呼び出し向け。複数ある場合は先頭。 */
    public String visibleAffiliationCompanyOrNull() {
        List<String> companies = visibleAffiliationCompaniesOrNull();
        if (companies == null) {
            return null;
        }
        if (companies.isEmpty()) {
            return "";
        }
        return companies.getFirst();
    }

    /**
     * サマリーカード表示対象の会社一覧（本職を先頭）。
     * 管理者・人事は全社。
     */
    public List<String> summaryAffiliationCompanies() {
        AppUserDetails user = securityService.currentUser();
        if (user == null) {
            return List.of();
        }
        if (securityService.hasAnyRole(AuthRoles.ADMIN, AuthRoles.HR)) {
            return AffiliationCompanies.ALL;
        }
        List<UserAssignment> assignments = effectiveAssignments(user);
        if (assignments.isEmpty()) {
            String company = normalizeRequiredCompany(user.getAffiliationCompany());
            return company != null ? List.of(company) : List.of();
        }
        LinkedHashSet<String> companies = new LinkedHashSet<>();
        for (UserAssignment assignment : assignments) {
            if (AuthRoles.ADMIN.equals(assignment.role()) || AuthRoles.EMPLOYEE.equals(assignment.role())) {
                continue;
            }
            String company = normalizeRequiredCompany(assignment.affiliationCompany());
            if (company != null) {
                companies.add(company);
            }
        }
        return List.copyOf(companies);
    }

    public boolean isPrimarySummaryCompany(String affiliationCompany) {
        AppUserDetails user = securityService.currentUser();
        if (user == null || affiliationCompany == null) {
            return false;
        }
        String company = AffiliationCompanies.normalize(affiliationCompany);
        List<UserAssignment> assignments = effectiveAssignments(user);
        for (UserAssignment assignment : assignments) {
            if (assignment.primary()
                    && company.equals(normalizeRequiredCompany(assignment.affiliationCompany()))) {
                return true;
            }
        }
        String primaryCompany = normalizeRequiredCompany(user.getAffiliationCompany());
        return company.equals(primaryCompany);
    }

    public void ensureEmployeeAccessible(Long employeeDepartmentId) {
        List<Long> scope = visibleDepartmentIdsOrNull();
        if (scope == null) {
            return;
        }
        if (employeeDepartmentId == null) {
            return;
        }
        if (!scope.contains(employeeDepartmentId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この社員情報を閲覧する権限がありません");
        }
    }

    /**
     * 営業会社フィルタがある場合のみ、社員の所属会社を追加チェックする。
     */
    public void ensureEmployeeCompanyAccessible(String employeeAffiliationCompany) {
        List<String> allowed = visibleAffiliationCompaniesOrNull();
        if (allowed == null) {
            return;
        }
        if (allowed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この社員情報を閲覧する権限がありません");
        }
        if (employeeAffiliationCompany == null || employeeAffiliationCompany.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この社員情報を閲覧する権限がありません");
        }
        String normalized = AffiliationCompanies.normalize(employeeAffiliationCompany);
        if (!allowed.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "この社員情報を閲覧する権限がありません");
        }
    }

    /** 新規登録・編集時に選択可能な部門。{@code null} = 制限なし。 */
    public List<Long> assignableDepartmentIdsOrNull() {
        AppUserDetails user = securityService.currentUser();
        if (user == null) {
            return List.of();
        }
        if (securityService.hasAnyRole(AuthRoles.ADMIN, AuthRoles.HR)) {
            return null;
        }
        List<UserAssignment> assignments = effectiveAssignments(user);
        if (assignments.isEmpty()) {
            return resolveLegacyAssignableDepartments(user);
        }
        Set<Long> ids = new LinkedHashSet<>();
        boolean anyScopedRole = false;
        for (UserAssignment assignment : assignments) {
            List<Long> scope = resolveAssignmentAssignableDepartments(assignment);
            if (scope == null) {
                return null;
            }
            if (isScopedRole(assignment.role())) {
                anyScopedRole = true;
                ids.addAll(scope);
            }
        }
        if (!anyScopedRole) {
            return null;
        }
        return List.copyOf(ids);
    }

    public List<DepartmentDto> assignableDepartments(List<DepartmentDto> departments) {
        List<Long> scope = assignableDepartmentIdsOrNull();
        if (scope == null) {
            return departments;
        }
        return departments.stream()
                .filter(department -> scope.contains(department.id()))
                .toList();
    }

    public void ensureDepartmentAssignable(Long departmentId) {
        List<Long> scope = assignableDepartmentIdsOrNull();
        if (scope == null) {
            return;
        }
        if (departmentId == null || !scope.contains(departmentId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "管轄外の部門には登録できません");
        }
    }

    public void ensureSearchDepartmentAllowed(Long departmentId) {
        if (departmentId == null || departmentId <= 0) {
            return;
        }
        List<Long> scope = visibleDepartmentIdsOrNull();
        if (scope == null) {
            return;
        }
        List<Long> expanded = expandDepartmentFilter(departmentId);
        boolean allowed = expanded.stream().anyMatch(scope::contains);
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "管轄外の部門は検索できません");
        }
    }

    private List<UserAssignment> effectiveAssignments(AppUserDetails user) {
        return user.getAssignments() != null ? user.getAssignments() : List.of();
    }

    private static boolean isScopedRole(String role) {
        return AuthRoles.SALES_HEAD.equals(role)
                || AuthRoles.DIVISION_HEAD.equals(role)
                || AuthRoles.DEPT_HEAD.equals(role);
    }

    private List<Long> resolveAssignmentVisibleDepartments(UserAssignment assignment) {
        if (AuthRoles.ADMIN.equals(assignment.role()) || AuthRoles.HR.equals(assignment.role())) {
            return null;
        }
        if (AuthRoles.SALES_HEAD.equals(assignment.role())) {
            return resolveSalesCompanyDepartmentsExceptHr(assignment.affiliationCompany());
        }
        if (AuthRoles.DIVISION_HEAD.equals(assignment.role())) {
            return resolveDivisionScope(assignment.departmentId());
        }
        if (AuthRoles.DEPT_HEAD.equals(assignment.role())) {
            return resolveDepartmentScope(assignment.departmentId());
        }
        return List.of();
    }

    private List<Long> resolveAssignmentAssignableDepartments(UserAssignment assignment) {
        if (AuthRoles.ADMIN.equals(assignment.role()) || AuthRoles.HR.equals(assignment.role())) {
            return null;
        }
        if (AuthRoles.SALES_HEAD.equals(assignment.role())) {
            return resolveSalesCompanyDepartmentsExceptHr(assignment.affiliationCompany());
        }
        if (AuthRoles.DIVISION_HEAD.equals(assignment.role())) {
            return resolveDivisionChildDepartments(assignment.departmentId());
        }
        if (AuthRoles.DEPT_HEAD.equals(assignment.role())) {
            return resolveDepartmentScope(assignment.departmentId());
        }
        return List.of();
    }

    private List<Long> resolveLegacyDepartmentScope(AppUserDetails user) {
        if (securityService.hasRole(AuthRoles.SALES_HEAD)) {
            return resolveSalesCompanyDepartmentsExceptHr(user.getAffiliationCompany());
        }
        if (securityService.hasRole(AuthRoles.DIVISION_HEAD)) {
            return resolveDivisionScope(user.getDepartmentId());
        }
        if (securityService.hasRole(AuthRoles.DEPT_HEAD)) {
            return resolveDepartmentScope(user.getDepartmentId());
        }
        return List.of();
    }

    private List<String> resolveLegacyAffiliationCompanies(AppUserDetails user) {
        if (!securityService.hasRole(AuthRoles.SALES_HEAD)) {
            return null;
        }
        String company = normalizeRequiredCompany(user.getAffiliationCompany());
        return company != null ? List.of(company) : List.of();
    }

    private List<Long> resolveLegacyAssignableDepartments(AppUserDetails user) {
        if (securityService.hasRole(AuthRoles.SALES_HEAD)) {
            return resolveSalesCompanyDepartmentsExceptHr(user.getAffiliationCompany());
        }
        if (securityService.hasRole(AuthRoles.DIVISION_HEAD)) {
            return resolveDivisionChildDepartments(user.getDepartmentId());
        }
        if (securityService.hasRole(AuthRoles.DEPT_HEAD)) {
            return resolveDepartmentScope(user.getDepartmentId());
        }
        return null;
    }

    private List<Long> expandDepartmentFilter(Long departmentId) {
        List<DepartmentDto> departments = employeeRepository.findAllDepartments();
        List<Long> ids = new ArrayList<>();
        ids.add(departmentId);
        for (DepartmentDto department : departments) {
            if (departmentId.equals(department.parentId())) {
                ids.add(department.id());
            }
        }
        return ids;
    }

    private List<Long> resolveDivisionScope(Long divisionId) {
        if (divisionId == null || divisionId <= 0) {
            return List.of();
        }
        List<DepartmentDto> departments = employeeRepository.findAllDepartments();
        List<Long> ids = new ArrayList<>();
        ids.add(divisionId);
        for (DepartmentDto department : departments) {
            if (divisionId.equals(department.parentId())) {
                ids.add(department.id());
            }
        }
        return ids;
    }

    private List<Long> resolveDivisionChildDepartments(Long divisionId) {
        if (divisionId == null || divisionId <= 0) {
            return List.of();
        }
        List<DepartmentDto> departments = employeeRepository.findAllDepartments();
        List<Long> ids = new ArrayList<>();
        for (DepartmentDto department : departments) {
            if (divisionId.equals(department.parentId())) {
                ids.add(department.id());
            }
        }
        return ids;
    }

    private List<Long> resolveDepartmentScope(Long departmentId) {
        if (departmentId == null || departmentId <= 0) {
            return List.of();
        }
        return List.of(departmentId);
    }

    private List<Long> resolveSalesCompanyDepartmentsExceptHr(String affiliationCompany) {
        String company = normalizeRequiredCompany(affiliationCompany);
        if (company == null) {
            return List.of();
        }
        List<DepartmentDto> departments = employeeRepository.findAllDepartments();
        return departments.stream()
                .filter(department -> company.equals(AffiliationCompanies.normalize(department.company())))
                .filter(department -> !MasterData.HR_DEPARTMENT_NAME.equals(department.name()))
                .map(DepartmentDto::id)
                .toList();
    }

    private static String normalizeRequiredCompany(String affiliationCompany) {
        if (affiliationCompany == null || affiliationCompany.isBlank()) {
            return null;
        }
        String trimmed = affiliationCompany.trim();
        if (!AffiliationCompanies.isValid(trimmed)) {
            return null;
        }
        return AffiliationCompanies.normalize(trimmed);
    }
}
