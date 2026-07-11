package jp.dispatch.employee.dto;

public record HrOpsClientMailStatusDto(
        boolean configured,
        String fromAddress
) {
}
