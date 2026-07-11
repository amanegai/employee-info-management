package jp.dispatch.employee.dto;

public record ClientContactDto(
        Long id,
        String contactName,
        String department,
        String position,
        String projectName,
        Long projectId,
        String phone,
        String email1,
        String email2,
        String email3,
        String responsibility,
        String notes,
        int sortOrder
) {
}
