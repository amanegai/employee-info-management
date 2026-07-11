package jp.dispatch.employee.dto;

import java.util.List;

public record ProjectCandidateSaveRequest(
        long employeeId,
        Integer matchScore,
        List<String> matchedSkills,
        String notes
) {
}
