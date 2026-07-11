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
        boolean enabled,
        boolean totpEnabled
) {
}
