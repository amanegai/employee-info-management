package jp.dispatch.employee.dto;

import java.util.List;

public record MasterDto(
        List<DepartmentDto> departments,
        List<DepartmentDto> assignableDepartments,
        List<String> positions,
        List<String> assignmentRoles,
        List<String> employeeTypes,
        List<String> workStatuses,
        List<String> evaluations
) {
}
