package jp.dispatch.employee.dto;

import java.util.List;

public record MasterImportResultDto(
        boolean dryRun,
        String target,
        int totalRows,
        int skippedRows,
        int validRows,
        int errorRows,
        int createdCount,
        List<String> previewNames,
        List<MasterImportRowErrorDto> errors
) {
}
