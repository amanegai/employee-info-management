package jp.dispatch.employee.service;

import jp.dispatch.employee.audit.AuditAction;
import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.AuthRoles;
import jp.dispatch.employee.auth.SecurityService;
import jp.dispatch.employee.dto.AuthUserListItemDto;
import jp.dispatch.employee.dto.AuthUserSaveRequest;
import jp.dispatch.employee.dto.DepartmentDto;
import jp.dispatch.employee.model.MasterData;
import jp.dispatch.employee.repository.AuthUserRepository;
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
        List<String> roles = normalizeRoles(request.roles());
        validateDepartmentForRoles(roles, request.departmentId());
        String email = normalizeEmail(request.email());
        authUserRepository.createUser(
                username,
                passwordEncoder.encode(request.password()),
                normalizeDisplayName(request.displayName(), username),
                email,
                request.departmentId(),
                roles
        );
        AuthUserListItemDto created = authUserRepository.findAllUsers().stream()
                .filter(user -> username.equals(user.username()))
                .findFirst()
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
        List<String> roles = normalizeRoles(request.roles());
        validateDepartmentForRoles(roles, request.departmentId());
        boolean enabled = request.enabled() == null || request.enabled();
        ensureAdminPreserved(existing, roles, enabled);

        authUserRepository.updateUser(
                id,
                normalizeDisplayName(request.displayName(), existing.username()),
                normalizeEmail(request.email()),
                request.departmentId(),
                enabled
        );
        if (request.password() != null && !request.password().isBlank()) {
            authUserRepository.updatePassword(id, passwordEncoder.encode(request.password()));
        }
        authUserRepository.replaceRoles(id, roles);
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
        List<String> roles = authUserRepository.findByUsername(user.username())
                .map(AppUserDetails::getRoles)
                .orElse(List.of());
        return new AuthUserListItemDto(
                user.id(),
                user.username(),
                user.displayName(),
                user.email(),
                roles,
                user.departmentId(),
                user.departmentName(),
                user.enabled(),
                user.totpEnabled()
        );
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
        if (request.roles() == null || request.roles().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ロールを1つ以上選択してください");
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

    private void validateDepartmentForRoles(List<String> roles, Long departmentId) {
        for (String role : roles) {
            if (AuthRoles.HR.equals(role)) {
                requireDepartmentNamed(departmentId, MasterData.HR_DEPARTMENT_NAME, "人事ロールは人事部への所属が必要です");
                return;
            }
            if (AuthRoles.SALES_HEAD.equals(role)) {
                requireDepartmentNamed(departmentId, MasterData.SALES_DEPARTMENT_NAME, "営業ロールは営業部への所属が必要です");
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
    }

    private void requireDepartmentNamed(Long departmentId, String expectedName, String message) {
        Long expectedId = findDepartmentIdByName(expectedName);
        if (expectedId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "部門マスタに「" + expectedName + "」が登録されていません"
            );
        }
        if (departmentId == null || !expectedId.equals(departmentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private Long findDepartmentIdByName(String name) {
        return employeeRepository.findAllDepartments().stream()
                .filter(department -> name.equals(department.name()))
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
