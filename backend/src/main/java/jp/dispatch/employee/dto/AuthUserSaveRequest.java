package jp.dispatch.employee.dto;

import java.util.List;

public record AuthUserSaveRequest(
        String username,
        String password,
        String displayName,
        String email,
        List<String> roles,
        Long departmentId,
        Long employeeId,
        Boolean enabled
) {
}
