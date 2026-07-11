package jp.dispatch.employee.dto;

public record HrOpsClientMailSendResult(
        boolean sent,
        boolean mailConfigured,
        String fromAddress,
        String message
) {
}
