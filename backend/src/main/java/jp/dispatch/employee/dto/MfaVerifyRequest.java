package jp.dispatch.employee.dto;

public record MfaVerifyRequest(String challengeToken, String code) {
}
