package jp.dispatch.employee.dto;

/** 社員IDの重複チェック結果 */
public record EmployeeCodeExistsDto(boolean exists) {
}
