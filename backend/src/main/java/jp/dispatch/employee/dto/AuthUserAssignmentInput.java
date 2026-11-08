package jp.dispatch.employee.dto;

/** ユーザー保存時の本職／兼職1行 */
public record AuthUserAssignmentInput(
        String affiliationCompany,
        String role,
        Long departmentId,
        Boolean primary
) {
}
