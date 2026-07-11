package jp.dispatch.employee.dto;

import java.util.List;

public record ProjectMatchResultDto(
        long employeeId,
        String employeeCode,
        String name,
        String departmentName,
        String workStatus,
        String endDate,
        int unitPrice,
        String evaluation,
        int matchScore,
        List<String> matchedSkills,
        List<String> missingSkills,
        List<String> matchedOptionalSkills,
        int activeCandidateCount,
        boolean alreadyAdded
) {
}
