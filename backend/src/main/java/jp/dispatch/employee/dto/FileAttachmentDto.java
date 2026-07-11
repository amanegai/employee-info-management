package jp.dispatch.employee.dto;

public record FileAttachmentDto(
        long id,
        String originalName,
        String contentType,
        long sizeBytes,
        String description,
        String category,
        String targetMonth,
        Long uploadedBy,
        String uploadedByName,
        String createdAt
) {
}
