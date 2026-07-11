package jp.dispatch.employee.dto;

public record EmployeeStatusMaintenanceResultDto(
        int suggestionsCreated,
        int statusChangesApplied,
        int assignmentsUpdated
) {
}
