package jp.dispatch.employee.auth;

import jp.dispatch.employee.dto.DepartmentDto;
import jp.dispatch.employee.model.MasterData;
import jp.dispatch.employee.repository.EmployeeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

/**
 * 閲覧可能な部門スコープを解決する。
 * {@code null} = 制限なし（全社員）、空リスト = 閲覧不可。
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
        if (securityService.hasRole(AuthRoles.SALES_HEAD)) {
            return resolveAllDepartmentsExceptHr();
        }
        if (securityService.hasRole(AuthRoles.DIVISION_HEAD)) {
            return resolveDivisionScope(user.getDepartmentId());
        }
        if (securityService.hasRole(AuthRoles.DEPT_HEAD)) {
            return resolveDepartmentScope(user.getDepartmentId());
        }
        return List.of();
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

    public void ensureEmployeeAccessible(Long employeeDepartmentId) {
        List<Long> scope = visibleDepartmentIdsOrNull();
        if (scope == null) {
            return;
        }
        // 履歴書インポート直後など、未配属社員は一覧・詳細を閲覧可能
        if (employeeDepartmentId == null) {
            return;
        }
        if (!scope.contains(employeeDepartmentId)) {
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
        if (securityService.hasRole(AuthRoles.SALES_HEAD)) {
            return resolveAllDepartmentsExceptHr();
        }
        if (securityService.hasRole(AuthRoles.DIVISION_HEAD)) {
            return resolveDivisionChildDepartments(user.getDepartmentId());
        }
        if (securityService.hasRole(AuthRoles.DEPT_HEAD)) {
            return resolveDepartmentScope(user.getDepartmentId());
        }
        return null;
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

    /** 検索条件の部門が閲覧スコープ内か検証する */
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

    private List<Long> resolveAllDepartmentsExceptHr() {
        List<DepartmentDto> departments = employeeRepository.findAllDepartments();
        Long hrDepartmentId = findHrDepartmentId(departments);
        if (hrDepartmentId == null) {
            return departments.stream().map(DepartmentDto::id).toList();
        }
        return departments.stream()
                .map(DepartmentDto::id)
                .filter(id -> !hrDepartmentId.equals(id))
                .toList();
    }

    private Long findHrDepartmentId(List<DepartmentDto> departments) {
        return departments.stream()
                .filter(department -> MasterData.HR_DEPARTMENT_NAME.equals(department.name()))
                .map(DepartmentDto::id)
                .findFirst()
                .orElse(null);
    }
}
