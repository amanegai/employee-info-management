package jp.dispatch.employee.dto;

import java.util.List;

public record AuthUserListItemDto(
        long id,
        String username,
        String displayName,
        String email,
        List<String> roles,
        Long departmentId,
        String departmentName,
        String affiliationCompany,
        Long employeeId,
        String employeeCode,
        String employeeName,
        boolean enabled,
        boolean totpEnabled,
        List<AuthUserAssignmentDto> assignments
) {
}
