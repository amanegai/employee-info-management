package jp.dispatch.employee.auth;

/** ログインユーザーの本職／兼職（権限スコープ用） */
public record UserAssignment(
        long id,
        String affiliationCompany,
        String role,
        Long departmentId,
        boolean primary,
        int sortOrder
) {
}
