package jp.dispatch.employee.dto;

import java.util.List;

public record ProjectCandidateDto(
        long id,
        long projectId,
        long employeeId,
        String employeeCode,
        String employeeName,
        String departmentName,
        String workStatus,
        String stage,
        Integer matchScore,
        List<String> matchedSkills,
        String proposedAt,
        String interviewAt,
        String confirmedAt,
        String closedAt,
        String closeReason,
        String notes,
        String createdAt,
        String updatedAt,
        String projectName,
        String clientName
) {
}
