package jp.dispatch.employee.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record NationalityDto(
        long id,
        String name,
        @JsonProperty("isJapan") boolean isJapan,
        int sortOrder,
        boolean active
) {
}
