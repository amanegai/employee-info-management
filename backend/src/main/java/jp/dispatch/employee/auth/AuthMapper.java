package jp.dispatch.employee.auth;

import jp.dispatch.employee.dto.AuthUserAssignmentDto;
import jp.dispatch.employee.dto.UserDto;

import java.util.List;

public final class AuthMapper {

    private AuthMapper() {
    }

    public static UserDto toUserDto(
            AppUserDetails user,
            boolean totpEnabled,
            int recoveryCodesRemaining,
            List<AuthUserAssignmentDto> assignments
    ) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getRoles(),
                user.getDepartmentId(),
                user.getAffiliationCompany(),
                user.getEmployeeId(),
                totpEnabled,
                recoveryCodesRemaining,
                assignments != null ? assignments : List.of()
        );
    }
}
