package jp.dispatch.employee.dto;

import jp.dispatch.employee.dto.EmployeeDetailDto.*;
import jp.dispatch.employee.model.AffiliationCompanies;

import java.util.List;

public record EmployeeSaveRequest(
        String employeeCode,
        String name,
        Long departmentId,
        String affiliationCompany,
        String position,
        String assignmentRole,
        String employeeType,
        String workStatus,
        int unitPrice,
        String evaluation,
        String endDate,
        PersonalDto personal,
        List<SkillDto> skills,
        List<TechnicalSkillDto> technicalSkills,
        List<QualificationDto> qualifications,
        List<CareerDto> careers,
        AttendanceDto attendance,
        EvaluationHistoryDto evaluationHistory,
        String memo,
        List<EvaluationItemSaveDto> evaluationItems,
        OverallEvaluationDto overallEvaluation,
        SalaryDto salary,
        HrDto hr
) {
    public record EvaluationItemSaveDto(
            String categoryCode,
            String itemName,
            String rankGrade,
            String comment
    ) {
    }

    public EmployeeRequest toEmployeeRequest() {
        return new EmployeeRequest(
                employeeCode,
                name,
                EmployeeFieldNormalizer.normalizeDepartmentId(departmentId),
                AffiliationCompanies.normalize(affiliationCompany),
                EmployeeFieldNormalizer.normalizeOptionalText(position),
                jp.dispatch.employee.model.AssignmentRoleCodes.normalize(assignmentRole),
                EmployeeFieldNormalizer.normalizeOptionalText(employeeType),
                EmployeeFieldNormalizer.normalizeOptionalText(workStatus),
                unitPrice,
                EmployeeFieldNormalizer.normalizeOptionalText(evaluation),
                endDate
        );
    }

    public EmployeeSaveRequest withoutSalaryAndHr() {
        return new EmployeeSaveRequest(
                employeeCode,
                name,
                departmentId,
                affiliationCompany,
                position,
                assignmentRole,
                employeeType,
                workStatus,
                unitPrice,
                evaluation,
                endDate,
                personal,
                skills,
                technicalSkills,
                qualifications,
                careers,
                attendance,
                evaluationHistory,
                memo,
                evaluationItems,
                overallEvaluation,
                null,
                null
        );
    }

    public EmployeeSaveRequest withSalaryAndHr(SalaryDto salary, HrDto hr) {
        return new EmployeeSaveRequest(
                employeeCode,
                name,
                departmentId,
                affiliationCompany,
                position,
                assignmentRole,
                employeeType,
                workStatus,
                unitPrice,
                evaluation,
                endDate,
                personal,
                skills,
                technicalSkills,
                qualifications,
                careers,
                attendance,
                evaluationHistory,
                memo,
                evaluationItems,
                overallEvaluation,
                salary,
                hr
        );
    }

    public EmployeeSaveRequest withWorkStatusAndHr(String workStatus, HrDto hr) {
        return new EmployeeSaveRequest(
                employeeCode,
                name,
                departmentId,
                affiliationCompany,
                position,
                assignmentRole,
                employeeType,
                workStatus,
                unitPrice,
                evaluation,
                endDate,
                personal,
                skills,
                technicalSkills,
                qualifications,
                careers,
                attendance,
                evaluationHistory,
                memo,
                evaluationItems,
                overallEvaluation,
                salary,
                hr
        );
    }
}
