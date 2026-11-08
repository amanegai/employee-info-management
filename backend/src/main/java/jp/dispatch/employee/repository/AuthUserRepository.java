package jp.dispatch.employee.repository;

import jp.dispatch.employee.auth.AppUserDetails;
import jp.dispatch.employee.auth.UserAssignment;
import jp.dispatch.employee.dto.AuthUserAssignmentDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public class AuthUserRepository {

    private final JdbcTemplate jdbc;

    public AuthUserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long countUsers() {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM auth_user", Long.class);
        return count != null ? count : 0L;
    }

    public boolean existsByUsername(String username) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM auth_user WHERE username = ?",
                Long.class,
                username
        );
        return count != null && count > 0;
    }

    public Optional<AppUserDetails> findByUsername(String username) {
        var users = jdbc.query(
                """
                SELECT id, username, password_hash, display_name, department_id, affiliation_company,
                       employee_id, enabled
                FROM auth_user
                WHERE username = ?
                """,
                (rs, rowNum) -> new AppUserDetails(
                        rs.getLong("id"),
                        rs.getString("username"),
                        rs.getString("password_hash"),
                        rs.getString("display_name"),
                        readNullableLong(rs, "department_id"),
                        blankToNull(rs.getString("affiliation_company")),
                        readNullableLong(rs, "employee_id"),
                        rs.getInt("enabled") == 1,
                        List.of()
                ),
                username
        );
        if (users.isEmpty()) {
            return Optional.empty();
        }
        AppUserDetails user = users.getFirst();
        List<UserAssignment> assignments = findAssignments(user.getId());
        List<String> roles = rolesFromAssignmentsOrTable(user.getId(), assignments);
        return Optional.of(new AppUserDetails(
                user.getId(),
                user.getUsername(),
                user.getPassword(),
                user.getDisplayName(),
                user.getDepartmentId(),
                user.getAffiliationCompany(),
                user.getEmployeeId(),
                user.isEnabled(),
                roles,
                assignments
        ));
    }

    public void createUser(
            String username,
            String passwordHash,
            String displayName,
            String email,
            Long departmentId,
            List<String> roles
    ) {
        createUser(username, passwordHash, displayName, email, departmentId, null, null, roles);
    }

    public void createUser(
            String username,
            String passwordHash,
            String displayName,
            String email,
            Long departmentId,
            String affiliationCompany,
            Long employeeId,
            List<String> roles
    ) {
        jdbc.update(
                """
                INSERT INTO auth_user (
                    username, password_hash, display_name, email,
                    department_id, affiliation_company, employee_id, enabled
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                """,
                username,
                passwordHash,
                displayName,
                email,
                departmentId,
                affiliationCompany,
                employeeId
        );
        Long userId = jdbc.queryForObject(
                "SELECT id FROM auth_user WHERE username = ?",
                Long.class,
                username
        );
        if (userId == null) {
            return;
        }
        for (String role : roles) {
            jdbc.update("INSERT INTO auth_user_role (user_id, role) VALUES (?, ?)", userId, role);
        }
        // 初期化系からの作成でも本職1行を残す（V47 以降）
        if (roles != null && !roles.isEmpty()) {
            replaceAssignments(userId, List.of(new AssignmentWrite(
                    affiliationCompany,
                    roles.getFirst(),
                    departmentId,
                    true,
                    0
            )));
        }
    }

    private List<String> findRoles(long userId) {
        return jdbc.query(
                "SELECT role FROM auth_user_role WHERE user_id = ? ORDER BY role",
                (rs, rowNum) -> rs.getString("role"),
                userId
        );
    }

    private List<String> rolesFromAssignmentsOrTable(long userId, List<UserAssignment> assignments) {
        if (assignments != null && !assignments.isEmpty()) {
            Set<String> roles = new LinkedHashSet<>();
            for (UserAssignment assignment : assignments) {
                if (assignment.role() != null && !assignment.role().isBlank()) {
                    roles.add(assignment.role());
                }
            }
            if (!roles.isEmpty()) {
                return new ArrayList<>(roles);
            }
        }
        return findRoles(userId);
    }

    public List<UserAssignment> findAssignments(long userId) {
        return jdbc.query(
                """
                SELECT id, affiliation_company, role, department_id, is_primary, sort_order
                FROM auth_user_assignment
                WHERE user_id = ?
                ORDER BY sort_order, id
                """,
                (rs, rowNum) -> new UserAssignment(
                        rs.getLong("id"),
                        blankToNull(rs.getString("affiliation_company")),
                        rs.getString("role"),
                        readNullableLong(rs, "department_id"),
                        rs.getBoolean("is_primary"),
                        rs.getInt("sort_order")
                ),
                userId
        );
    }

    public List<AuthUserAssignmentDto> findAssignmentDtos(long userId) {
        return jdbc.query(
                """
                SELECT a.id, a.affiliation_company, a.role, a.department_id, d.name AS department_name,
                       a.is_primary, a.sort_order
                FROM auth_user_assignment a
                LEFT JOIN department d ON d.id = a.department_id
                WHERE a.user_id = ?
                ORDER BY a.sort_order, a.id
                """,
                (rs, rowNum) -> new AuthUserAssignmentDto(
                        rs.getLong("id"),
                        blankToNull(rs.getString("affiliation_company")),
                        rs.getString("role"),
                        readNullableLong(rs, "department_id"),
                        rs.getString("department_name"),
                        rs.getBoolean("is_primary"),
                        rs.getInt("sort_order")
                ),
                userId
        );
    }

    public void replaceAssignments(long userId, List<AssignmentWrite> assignments) {
        jdbc.update("DELETE FROM auth_user_assignment WHERE user_id = ?", userId);
        if (assignments == null || assignments.isEmpty()) {
            return;
        }
        int order = 0;
        for (AssignmentWrite assignment : assignments) {
            jdbc.update(
                    """
                    INSERT INTO auth_user_assignment (
                        user_id, affiliation_company, role, department_id, is_primary, sort_order
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    userId,
                    assignment.affiliationCompany(),
                    assignment.role(),
                    assignment.departmentId(),
                    assignment.primary(),
                    assignment.sortOrder() >= 0 ? assignment.sortOrder() : order
            );
            order += 1;
        }
    }

    public record AssignmentWrite(
            String affiliationCompany,
            String role,
            Long departmentId,
            boolean primary,
            int sortOrder
    ) {
    }

    private static Long readNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    public List<AuthUserRecord> findAllUsers() {
        return jdbc.query(
                """
                SELECT u.id, u.username, u.display_name, u.email, u.department_id, d.name AS department_name,
                       u.affiliation_company,
                       u.employee_id, e.employee_code, e.name AS employee_name, u.enabled,
                       COALESCE(u.totp_enabled, 0) AS totp_enabled
                FROM auth_user u
                LEFT JOIN department d ON d.id = u.department_id
                LEFT JOIN employee e ON e.id = u.employee_id
                ORDER BY u.username
                """,
                (rs, rowNum) -> mapUserRecord(rs)
        );
    }

    public Optional<AuthUserRecord> findUserById(long id) {
        var users = jdbc.query(
                """
                SELECT u.id, u.username, u.display_name, u.email, u.department_id, d.name AS department_name,
                       u.affiliation_company,
                       u.employee_id, e.employee_code, e.name AS employee_name, u.enabled,
                       COALESCE(u.totp_enabled, 0) AS totp_enabled
                FROM auth_user u
                LEFT JOIN department d ON d.id = u.department_id
                LEFT JOIN employee e ON e.id = u.employee_id
                WHERE u.id = ?
                """,
                (rs, rowNum) -> mapUserRecord(rs),
                id
        );
        return users.isEmpty() ? Optional.empty() : Optional.of(users.getFirst());
    }

    private AuthUserRecord mapUserRecord(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new AuthUserRecord(
                rs.getLong("id"),
                rs.getString("username"),
                rs.getString("display_name"),
                rs.getString("email"),
                readNullableLong(rs, "department_id"),
                rs.getString("department_name"),
                blankToNull(rs.getString("affiliation_company")),
                readNullableLong(rs, "employee_id"),
                rs.getString("employee_code"),
                rs.getString("employee_name"),
                rs.getInt("enabled") == 1,
                rs.getInt("totp_enabled") == 1
        );
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    public boolean isTotpEnabled(long userId) {
        Integer enabled = jdbc.queryForObject(
                "SELECT totp_enabled FROM auth_user WHERE id = ?",
                Integer.class,
                userId
        );
        return enabled != null && enabled == 1;
    }

    public Optional<String> findTotpSecret(long userId) {
        var secrets = jdbc.query(
                "SELECT totp_secret FROM auth_user WHERE id = ? AND totp_enabled = 1",
                (rs, rowNum) -> rs.getString("totp_secret"),
                userId
        );
        if (secrets.isEmpty()) {
            return Optional.empty();
        }
        String secret = secrets.getFirst();
        return secret != null && !secret.isBlank() ? Optional.of(secret) : Optional.empty();
    }

    public void enableTotp(long userId, String secret) {
        jdbc.update(
                "UPDATE auth_user SET totp_secret = ?, totp_enabled = 1 WHERE id = ?",
                secret,
                userId
        );
    }

    public void disableTotp(long userId) {
        jdbc.update(
                "UPDATE auth_user SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?",
                userId
        );
    }

    public void updateUser(
            long id,
            String displayName,
            String email,
            Long departmentId,
            String affiliationCompany,
            Long employeeId,
            boolean enabled
    ) {
        jdbc.update(
                """
                UPDATE auth_user
                SET display_name = ?, email = ?, department_id = ?, affiliation_company = ?,
                    employee_id = ?, enabled = ?
                WHERE id = ?
                """,
                displayName,
                email,
                departmentId,
                affiliationCompany,
                employeeId,
                enabled ? 1 : 0,
                id
        );
    }

    public Optional<String> findEmailById(long id) {
        var emails = jdbc.query(
                "SELECT email FROM auth_user WHERE id = ? AND enabled = 1",
                (rs, rowNum) -> rs.getString("email"),
                id
        );
        if (emails.isEmpty()) {
            return Optional.empty();
        }
        String email = emails.getFirst();
        return email != null && !email.isBlank() ? Optional.of(email.trim()) : Optional.empty();
    }

    public void updatePassword(long id, String passwordHash) {
        jdbc.update("UPDATE auth_user SET password_hash = ? WHERE id = ?", passwordHash, id);
    }

    public void replaceRoles(long id, List<String> roles) {
        jdbc.update("DELETE FROM auth_user_role WHERE user_id = ?", id);
        for (String role : roles) {
            jdbc.update("INSERT INTO auth_user_role (user_id, role) VALUES (?, ?)", id, role);
        }
    }

    public boolean deleteUser(long id) {
        jdbc.update("DELETE FROM auth_user_assignment WHERE user_id = ?", id);
        jdbc.update("DELETE FROM auth_user_role WHERE user_id = ?", id);
        return jdbc.update("DELETE FROM auth_user WHERE id = ?", id) > 0;
    }

    public long countEnabledUsersWithRole(String role) {
        Long count = jdbc.queryForObject(
                """
                SELECT COUNT(DISTINCT u.id)
                FROM auth_user u
                INNER JOIN auth_user_role r ON r.user_id = u.id
                WHERE r.role = ? AND u.enabled = 1
                """,
                Long.class,
                role
        );
        return count != null ? count : 0L;
    }

    public boolean isEmployeeLinkedToOtherUser(long employeeId, Long excludeUserId) {
        Long count;
        if (excludeUserId == null) {
            count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM auth_user WHERE employee_id = ?",
                    Long.class,
                    employeeId
            );
        } else {
            count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM auth_user WHERE employee_id = ? AND id != ?",
                    Long.class,
                    employeeId,
                    excludeUserId
            );
        }
        return count != null && count > 0;
    }

    public List<String> findAdminEmails() {
        return jdbc.query(
                """
                SELECT DISTINCT u.email
                FROM auth_user u
                JOIN auth_user_role r ON r.user_id = u.id
                WHERE r.role = 'ADMIN'
                  AND u.enabled = 1
                  AND u.email IS NOT NULL
                  AND TRIM(u.email) != ''
                """,
                (rs, rowNum) -> rs.getString("email").trim()
        );
    }

    /** 案件・BP求援通知の宛先（人事以外の有効ユーザー。依頼者本人は呼び出し側で除外） */
    public List<Long> findProjectNotificationRecipientIds() {
        return jdbc.query(
                """
                SELECT DISTINCT u.id
                FROM auth_user u
                JOIN auth_user_role r ON r.user_id = u.id
                WHERE u.enabled = 1
                  AND r.role IN ('ADMIN', 'DIVISION_HEAD', 'DEPT_HEAD', 'SALES_HEAD')
                ORDER BY u.id
                """,
                (rs, rowNum) -> rs.getLong("id")
        );
    }

    public record AuthUserRecord(
            long id,
            String username,
            String displayName,
            String email,
            Long departmentId,
            String departmentName,
            String affiliationCompany,
            Long employeeId,
            String employeeCode,
            String employeeName,
            boolean enabled,
            boolean totpEnabled
    ) {
    }
}
