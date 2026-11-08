package jp.dispatch.employee.dto;

import java.util.List;

public record AuthUserSaveRequest(
        String username,
        String password,
        String displayName,
        String email,
        List<AuthUserAssignmentInput> assignments,
        List<String> roles,
        Long departmentId,
        String affiliationCompany,
        Long employeeId,
        Boolean enabled
) {
}
