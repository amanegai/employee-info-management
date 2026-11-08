package jp.dispatch.employee.dto;

import java.util.List;

public record UserDto(
        long id,
        String username,
        String displayName,
        List<String> roles,
        Long departmentId,
        Long employeeId,
        boolean totpEnabled,
        int recoveryCodesRemaining
) {
}
