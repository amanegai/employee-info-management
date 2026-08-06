package jp.dispatch.employee.dto;

public record BpHelpReferralHireRequest(
        String startDate,
        String endDate,
        Long departmentId,
        String notes
) {
}
