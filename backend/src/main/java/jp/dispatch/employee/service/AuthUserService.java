package jp.dispatch.employee.service;

import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.AuthRoles;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.AuthUserAssignmentDto;
import jp.dispatch.employee.dto.AuthUserAssignmentInput;
import jp.dispatch.employee.dto.AuthUserListItemDto;
import jp.dispatch.employee.dto.AuthUserSaveRequest;
import jp.dispatch.employee.dto.DepartmentDto;
import jp.dispatch.employee.model.AffiliationCompanies;
import jp.dispatch.employee.model.MasterData;
import jp.dispatch.employee.repository.AuthUserRepository;
import jp.dispatch.employee.repository.AuthUserRepository.AssignmentWrite;
import jp.dispatch.employee.repository.AuthUserRepository.AuthUserRecord;
import jp.dispatch.employee.repository.EmployeeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class AuthUserService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private static final List<String> ASSIGNABLE_ROLES = List.of(
            AuthRoles.ADMIN,
            AuthRoles.HR,
            AuthRoles.EMPLOYEE,
            AuthRoles.DIVISION_HEAD,
            AuthRoles.DEPT_HEAD,
            AuthRoles.SALES_HEAD
    );

    private final AuthUserRepository authUserRepository;
    private final EmployeeRepository employeeRepository;
    private final SecurityService securityService;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public AuthUserService(
            AuthUserRepository authUserRepository,
            EmployeeRepository employeeRepository,
            SecurityService securityService,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService
    ) {
        this.authUserRepository = authUserRepository;
        this.employeeRepository = employeeRepository;
        this.securityService = securityService;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    public List<AuthUserListItemDto> list() {
        requireManagePermission();
        return authUserRepository.findAllUsers().stream()
                .map(this::toListItem)
                .toList();
    }

    public AuthUserListItemDto create(AuthUserSaveRequest request) {
        requireManagePermission();
        validateSaveRequest(request, true);
        String username = request.username().trim();
        if (authUserRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ユーザー名が既に登録されています");
        }
        List<AssignmentWrite> assignments = normalizeAssignments(request);
        List<String> roles = rolesFromAssignments(assignments);
        AssignmentWrite primary = primaryAssignment(assignments);
        Long employeeId = normalizeEmployeeId(request.employeeId(), null);
        String email = normalizeEmail(request.email());
        authUserRepository.createUser(
                username,
                passwordEncoder.encode(request.password()),
                normalizeDisplayName(request.displayName(), username),
                email,
                primary.departmentId(),
                primary.affiliationCompany(),
                employeeId,
                roles
        );
        Long userId = authUserRepository.findAllUsers().stream()
                .filter(user -> username.equals(user.username()))
                .map(AuthUserRecord::id)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "ユーザーの作成に失敗しました"));
        authUserRepository.replaceAssignments(userId, assignments);
        AuthUserListItemDto created = authUserRepository.findUserById(userId)
                .map(this::toListItem)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "ユーザーの作成に失敗しました"));
        auditLogService.log(AuditAction.USER_CREATE, "auth_user", username, null);
        return created;
    }

    public AuthUserListItemDto update(long id, AuthUserSaveRequest request) {
        requireManagePermission();
        AuthUserRecord existing = authUserRepository.findUserById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ユーザーが見つかりません"));
        validateSaveRequest(request, false);
        List<AssignmentWrite> assignments = normalizeAssignments(request);
        List<String> roles = rolesFromAssignments(assignments);
        AssignmentWrite primary = primaryAssignment(assignments);
        boolean enabled = request.enabled() == null || request.enabled();
        ensureAdminPreserved(existing, roles, enabled);
        Long employeeId = normalizeEmployeeId(request.employeeId(), id);

        authUserRepository.updateUser(
                id,
                normalizeDisplayName(request.displayName(), existing.username()),
                normalizeEmail(request.email()),
                primary.departmentId(),
                primary.affiliationCompany(),
                employeeId,
                enabled
        );
        if (request.password() != null && !request.password().isBlank()) {
            authUserRepository.updatePassword(id, passwordEncoder.encode(request.password()));
        }
        authUserRepository.replaceRoles(id, roles);
        authUserRepository.replaceAssignments(id, assignments);
        AppUserDetails current = securityService.currentUser();
        if (current != null && current.getId() == id) {
            securityService.refreshCurrentUser();
        }
        AuthUserListItemDto updated = authUserRepository.findUserById(id)
                .map(this::toListItem)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ユーザーが見つかりません"));
        auditLogService.log(AuditAction.USER_UPDATE, "auth_user", String.valueOf(id), existing.username());
        return updated;
    }

    public void delete(long id) {
        requireManagePermission();
        AuthUserRecord existing = authUserRepository.findUserById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ユーザーが見つかりません"));
        AppUserDetails current = securityService.currentUser();
        if (current != null && current.getId() == id) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ログイン中のユーザーは削除できません");
        }
        List<String> roles = authUserRepository.findByUsername(existing.username())
                .map(AppUserDetails::getRoles)
                .orElse(List.of());
        if (roles.contains(AuthRoles.ADMIN) && authUserRepository.countEnabledUsersWithRole(AuthRoles.ADMIN) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "最後の管理者は削除できません");
        }
        if (!authUserRepository.deleteUser(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ユーザーが見つかりません");
        }
        auditLogService.log(AuditAction.USER_DELETE, "auth_user", String.valueOf(id), existing.username());
    }

    private AuthUserListItemDto toListItem(AuthUserRecord user) {
        List<AuthUserAssignmentDto> assignments = authUserRepository.findAssignmentDtos(user.id());
        List<String> roles = assignments.isEmpty()
                ? authUserRepository.findByUsername(user.username()).map(AppUserDetails::getRoles).orElse(List.of())
                : assignments.stream().map(AuthUserAssignmentDto::role).distinct().toList();
        return new AuthUserListItemDto(
                user.id(),
                user.username(),
                user.displayName(),
                user.email(),
                roles,
                user.departmentId(),
                user.departmentName(),
                user.affiliationCompany(),
                user.employeeId(),
                user.employeeCode(),
                user.employeeName(),
                user.enabled(),
                user.totpEnabled(),
                assignments
        );
    }

    private List<AssignmentWrite> normalizeAssignments(AuthUserSaveRequest request) {
        List<AuthUserAssignmentInput> inputs = request.assignments();
        if (inputs == null || inputs.isEmpty()) {
            // 互換：旧API（roles + departmentId + affiliationCompany）
            List<String> roles = normalizeRoles(request.roles());
            validateDepartmentForRoles(roles, request.departmentId(), request.affiliationCompany());
            String affiliationCompany = normalizeAffiliationCompanyForRoles(roles, request.affiliationCompany());
            return List.of(new AssignmentWrite(
                    affiliationCompany,
                    roles.getFirst(),
                    request.departmentId(),
                    true,
                    0
            ));
        }

        List<AssignmentWrite> normalized = new ArrayList<>();
        int order = 0;
        int primaryCount = 0;
        Set<String> seen = new LinkedHashSet<>();
        for (AuthUserAssignmentInput input : inputs) {
            if (input == null || input.role() == null || input.role().isBlank()) {
                continue;
            }
            String role = input.role().trim();
            if (!ASSIGNABLE_ROLES.contains(role)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ロールが不正です: " + role);
            }
            String company = normalizeAffiliationCompanyForRoles(List.of(role), input.affiliationCompany());
            Long departmentId = input.departmentId();
            validateDepartmentForRoles(List.of(role), departmentId, company);
            boolean primary = Boolean.TRUE.equals(input.primary());
            if (primary) {
                primaryCount += 1;
            }
            String key = role + "|" + (company != null ? company : "") + "|" + (departmentId != null ? departmentId : "");
            if (!seen.add(key)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "本職・兼職の内容が重複しています（同じ会社・ロール・部門は設定できません）"
                );
            }
            normalized.add(new AssignmentWrite(company, role, departmentId, primary, order));
            order += 1;
        }
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "本職または兼職を1つ以上設定してください");
        }
        if (primaryCount == 0) {
            AssignmentWrite first = normalized.getFirst();
            normalized.set(0, new AssignmentWrite(
                    first.affiliationCompany(),
                    first.role(),
                    first.departmentId(),
                    true,
                    first.sortOrder()
            ));
        } else if (primaryCount > 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "本職は1つのみ指定してください");
        }
        validateSideAssignmentRules(normalized);
        return normalized;
    }

    private static final Set<String> SIDE_ASSIGNMENT_ROLES = Set.of(
            AuthRoles.DIVISION_HEAD,
            AuthRoles.DEPT_HEAD,
            AuthRoles.SALES_HEAD
    );

    private void validateSideAssignmentRules(List<AssignmentWrite> assignments) {
        AssignmentWrite primary = primaryAssignment(assignments);
        boolean primaryBlocksSide = AuthRoles.ADMIN.equals(primary.role())
                || AuthRoles.EMPLOYEE.equals(primary.role());
        if (primaryBlocksSide && assignments.size() > 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "管理者・一般社員の本職では兼職を設定できません"
            );
        }
        for (AssignmentWrite assignment : assignments) {
            if (assignment.primary()) {
                continue;
            }
            if (!SIDE_ASSIGNMENT_ROLES.contains(assignment.role())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "兼職ロールは事業部長・部長・営業のみ選択できます"
                );
            }
        }
    }

    private static List<String> rolesFromAssignments(List<AssignmentWrite> assignments) {
        Set<String> roles = new LinkedHashSet<>();
        for (AssignmentWrite assignment : assignments) {
            roles.add(assignment.role());
        }
        return new ArrayList<>(roles);
    }

    private static AssignmentWrite primaryAssignment(List<AssignmentWrite> assignments) {
        return assignments.stream()
                .filter(AssignmentWrite::primary)
                .findFirst()
                .orElse(assignments.getFirst());
    }

    private Long normalizeEmployeeId(Long employeeId, Long excludeUserId) {
        if (employeeId == null || employeeId <= 0) {
            return null;
        }
        if (employeeRepository.findById(employeeId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "連携する社員が見つかりません");
        }
        if (authUserRepository.isEmployeeLinkedToOtherUser(employeeId, excludeUserId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "この社員は既に別ユーザーに連携されています");
        }
        return employeeId;
    }

    private void requireManagePermission() {
        if (!securityService.canManageUsers()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ユーザー管理権限がありません");
        }
    }

    private void validateSaveRequest(AuthUserSaveRequest request, boolean creating) {
        if (creating) {
            if (request.username() == null || request.username().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ユーザー名は必須です");
            }
            if (request.password() == null || request.password().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "パスワードは必須です");
            }
        }
        boolean hasAssignments = request.assignments() != null && !request.assignments().isEmpty();
        boolean hasRoles = request.roles() != null && !request.roles().isEmpty();
        if (!hasAssignments && !hasRoles) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "本職または兼職を1つ以上設定してください");
        }
    }

    private List<String> normalizeRoles(List<String> roles) {
        Set<String> normalized = new LinkedHashSet<>();
        for (String role : roles) {
            if (role == null || role.isBlank()) {
                continue;
            }
            String trimmed = role.trim();
            if (!ASSIGNABLE_ROLES.contains(trimmed)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ロールが不正です: " + trimmed);
            }
            normalized.add(trimmed);
        }
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ロールを1つ以上選択してください");
        }
        return new ArrayList<>(normalized);
    }

    /**
     * 管理者は所属会社を持たない（会社横断）。
     * その他ロールは必須でマスタ値を保存する。
     */
    private String normalizeAffiliationCompanyForRoles(List<String> roles, String raw) {
        if (roles.contains(AuthRoles.ADMIN)) {
            return null;
        }
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属会社を選択してください");
        }
        String company = raw.trim();
        if (!AffiliationCompanies.isValid(company)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属会社が不正です");
        }
        return company;
    }

    private void validateDepartmentForRoles(List<String> roles, Long departmentId, String affiliationCompany) {
        for (String role : roles) {
            if (AuthRoles.HR.equals(role)) {
                requireDepartmentNamed(
                        departmentId,
                        MasterData.HR_DEPARTMENT_NAME,
                        affiliationCompany,
                        "人事ロールは人事部への所属が必要です"
                );
                return;
            }
            if (AuthRoles.SALES_HEAD.equals(role)) {
                requireDepartmentNamed(
                        departmentId,
                        MasterData.SALES_DEPARTMENT_NAME,
                        affiliationCompany,
                        "営業ロールは営業部への所属が必要です"
                );
                return;
            }
        }
        boolean needsDepartment = roles.stream().anyMatch(
                role -> AuthRoles.DIVISION_HEAD.equals(role) || AuthRoles.DEPT_HEAD.equals(role)
        );
        if (needsDepartment && (departmentId == null || departmentId <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "事業部長・部長には所属部門が必要です");
        }
        if (departmentId != null && departmentId > 0 && !employeeRepository.departmentExists(departmentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属部門が不正です");
        }
        if (departmentId != null && departmentId > 0 && affiliationCompany != null) {
            String deptCompany = employeeRepository.findDepartmentCompanyById(departmentId).orElse(null);
            if (deptCompany != null
                    && !AffiliationCompanies.normalize(deptCompany)
                    .equals(AffiliationCompanies.normalize(affiliationCompany))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "所属部門と所属会社が一致しません");
            }
        }
    }

    private void requireDepartmentNamed(Long departmentId, String expectedName, String company, String message) {
        Long expectedId = findDepartmentIdByName(expectedName, company);
        if (expectedId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "部門マスタに「" + expectedName + "」が登録されていません"
                            + (company != null ? "（" + company + "）" : "")
            );
        }
        if (departmentId == null || !expectedId.equals(departmentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private Long findDepartmentIdByName(String name, String company) {
        return employeeRepository.findAllDepartments().stream()
                .filter(department -> name.equals(department.name()))
                .filter(department -> company == null
                        || AffiliationCompanies.normalize(company)
                        .equals(AffiliationCompanies.normalize(department.company())))
                .map(DepartmentDto::id)
                .findFirst()
                .orElse(null);
    }

    private void ensureAdminPreserved(AuthUserRecord existing, List<String> newRoles, boolean enabled) {
        AppUserDetails current = securityService.currentUser();
        List<String> oldRoles = authUserRepository.findByUsername(existing.username())
                .map(AppUserDetails::getRoles)
                .orElse(List.of());
        boolean wasAdmin = oldRoles.contains(AuthRoles.ADMIN);
        boolean willBeAdmin = newRoles.contains(AuthRoles.ADMIN) && enabled;
        if (wasAdmin && !willBeAdmin && authUserRepository.countEnabledUsersWithRole(AuthRoles.ADMIN) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "最後の管理者の権限は変更できません");
        }
        if (current != null && current.getId() == existing.id() && !enabled) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ログイン中のユーザーは無効化できません");
        }
    }

    private static String normalizeDisplayName(String displayName, String username) {
        if (displayName == null || displayName.isBlank()) {
            return username;
        }
        return displayName.trim();
    }

    private static String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        String trimmed = email.trim();
        if (!EMAIL_PATTERN.matcher(trimmed).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "メールアドレスの形式が不正です");
        }
        return trimmed;
    }
}
