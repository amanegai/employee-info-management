package jp.dispatch.employee.dto;

import java.util.List;

public record MfaRecoveryCodesResponse(List<String> recoveryCodes, int recoveryCodesRemaining) {
}
