package jp.dispatch.employee.dto;

public record DispatchProjectStatusRequest(
        String status,
        String notes
) {
}
