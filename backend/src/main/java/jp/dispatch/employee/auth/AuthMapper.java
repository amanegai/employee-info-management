package jp.dispatch.employee.auth;

import jp.dispatch.employee.dto.UserDto;

public final class AuthMapper {

    private AuthMapper() {
    }

    public static UserDto toUserDto(AppUserDetails user, boolean totpEnabled, int recoveryCodesRemaining) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getRoles(),
                user.getDepartmentId(),
                user.getEmployeeId(),
                totpEnabled,
                recoveryCodesRemaining
        );
    }
}
