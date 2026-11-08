package jp.dispatch.employee.dto;

/** ユーザーの本職／兼職（権限側のみ。社員マスタには保存しない） */
public record AuthUserAssignmentDto(
        Long id,
        String affiliationCompany,
        String role,
        Long departmentId,
        String departmentName,
        boolean primary,
        int sortOrder
) {
}
