package jp.dispatch.employee.dto;

public record HrOpsClientMailSendRequest(
        String recipientEmail,
        Long clientId,
        String documentType,
        String subject,
        String body,
        Long fileId
) {
}
