package jp.dispatch.employee.dto;

import java.util.List;

public record UserDto(
        long id,
        String username,
        String displayName,
        List<String> roles,
        Long departmentId,
        boolean totpEnabled,
        int recoveryCodesRemaining
) {
}
