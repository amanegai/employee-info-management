package jp.dispatch.employee.dto;

import java.util.List;

public record ProjectMatchResponseDto(
        ProjectMatchParsedDto parsed,
        List<ProjectMatchResultDto> results
) {
}
