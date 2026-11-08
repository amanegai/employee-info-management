package jp.dispatch.employee.dto;

import java.util.List;

public record UserDto(
        long id,
        String username,
        String displayName,
        List<String> roles,
        Long departmentId,
        String affiliationCompany,
        Long employeeId,
        boolean totpEnabled,
        int recoveryCodesRemaining,
        List<AuthUserAssignmentDto> assignments
) {
}
