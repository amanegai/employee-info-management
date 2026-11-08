package jp.dispatch.employee.dto;

/** 欠番優先の推奨社員ID */
public record NextEmployeeCodeDto(
        String employeeCode,
        String latestEmployeeCode,
        String prefix,
        String typeLetter
) {
    public NextEmployeeCodeDto(String employeeCode) {
        this(employeeCode, null, null, null);
    }
}
