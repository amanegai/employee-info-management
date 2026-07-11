package jp.dispatch.employee.dto;

public record HrOpsRequestActionRequest(
        String hrNotes,
        String rejectReason
) {
}
