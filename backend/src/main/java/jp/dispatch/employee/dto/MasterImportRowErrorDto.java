package jp.dispatch.employee.dto;

public record MasterImportRowErrorDto(
        int row,
        String sheet,
        String field,
        String message
) {
    public MasterImportRowErrorDto(int row, String field, String message) {
        this(row, "", field, message);
    }
}
