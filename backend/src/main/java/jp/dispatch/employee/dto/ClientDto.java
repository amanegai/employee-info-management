package jp.dispatch.employee.dto;

public record ClientDto(
        long id,
        String clientCode,
        String name,
        String location,
        String primaryContactName,
        String clientRank,
        String industry,
        String contractStatus,
        int relatedProjectCount,
        String updatedAt
) {
}
