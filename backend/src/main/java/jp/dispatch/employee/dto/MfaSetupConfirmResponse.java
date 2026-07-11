package jp.dispatch.employee.dto;

import java.util.List;

public record MfaSetupConfirmResponse(
        UserDto user,
        List<String> recoveryCodes,
        int recoveryCodesRemaining
) {
}
