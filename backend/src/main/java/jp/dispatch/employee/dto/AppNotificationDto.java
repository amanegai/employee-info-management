package jp.dispatch.employee.dto;

public record AppNotificationDto(
        long id,
        String type,
        String title,
        String body,
        String linkPath,
        Long projectId,
        Long actorUserId,
        String actorDisplayName,
        String readAt,
        String resolvedAt,
        String createdAt,
        boolean unread
) {
}
