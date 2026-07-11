package jp.dispatch.employee.dto;

public record AuditLogDto(
        long id,
        String occurredAt,
        Long userId,
        String username,
        String action,
        String entityType,
        String entityId,
        String detail,
        String ipAddress
) {
}
