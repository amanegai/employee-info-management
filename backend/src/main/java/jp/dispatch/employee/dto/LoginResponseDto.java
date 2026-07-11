package jp.dispatch.employee.dto;

public record LoginResponseDto(
        String status,
        UserDto user,
        String challengeToken,
        String username
) {
    public static final String STATUS_SUCCESS = "SUCCESS";
    public static final String STATUS_MFA_REQUIRED = "MFA_REQUIRED";
    public static final String STATUS_MFA_SETUP_REQUIRED = "MFA_SETUP_REQUIRED";

    public static LoginResponseDto success(UserDto user) {
        return new LoginResponseDto(STATUS_SUCCESS, user, null, null);
    }

    public static LoginResponseDto mfaRequired(String challengeToken, String username) {
        return new LoginResponseDto(STATUS_MFA_REQUIRED, null, challengeToken, username);
    }

    public static LoginResponseDto mfaSetupRequired(String challengeToken, String username) {
        return new LoginResponseDto(STATUS_MFA_SETUP_REQUIRED, null, challengeToken, username);
    }
}
