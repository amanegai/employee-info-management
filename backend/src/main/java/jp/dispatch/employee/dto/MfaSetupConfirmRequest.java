package jp.dispatch.employee.dto;

public record MfaSetupConfirmRequest(String challengeToken, String code) {
}
