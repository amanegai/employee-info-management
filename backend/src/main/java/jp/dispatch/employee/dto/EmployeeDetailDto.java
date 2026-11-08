package jp.dispatch.employee.dto;

import java.util.List;

public record EmployeeDetailDto(
        long id,
        String employeeCode,
        String name,
        Long departmentId,
        String departmentName,
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
        List<EvaluationCategoryDto> evaluationCategories,
        OverallEvaluationDto overallEvaluation,
        SalaryDto salary,
        HrDto hr,
        List<MonthlyExpenseDto> monthlyExpenses,
        EvaluationCalcDto evaluationCalculation,
        boolean evaluationCalculated,
        int version,
        String updatedAt,
        String updatedByName
) {
    public record MonthlyExpenseDto(
            String targetMonth,
            int periodicPassAllowance,
            int commuterIndividualAllowance,
            int businessExpenseAllowance,
            String sourceFileName,
            Long sourceFileId,
            String importedAt
    ) {
    }

    public record PersonalDto(
            String gender,
            String birthDate,
            Integer age,
            Long nationalityId,
            String nationality,
            Boolean nationalityIsJapan,
            Long residenceStatusId,
            String residenceStatus,
            String residenceCardNumber,
            String residenceCardExpiry,
            String phone,
            String email,
            String address,
            String education,
            String nearestStation,
            String photoUrl,
            String furigana,
            String maritalStatus,
            Integer itIndustryYears,
            String japanArrivalDate,
            String educationDegree,
            String schoolName,
            String major,
            String japaneseLevel,
            String japaneseConversation,
            String japaneseReading,
            String japaneseWriting,
            String englishLevel,
            String englishConversation,
            String englishReading,
            String englishWriting,
            String technicalLevel,
            String specialtyDev,
            String specialtyBusiness,
            String selfPr
    ) {
    }

    public record SkillDto(String skillName, int level, int experienceYears) {
    }

    public record TechnicalSkillDto(String category, String itemName, String level) {
    }

    public record QualificationDto(String description) {
    }

    public record CareerDto(
            String period,
            String organization,
            String roleOverview,
            String startDate,
            String endDate,
            Integer months,
            String workplace,
            String role,
            String osDb,
            String languages,
            String fwTools,
            String phases
    ) {
    }

    public record DailyAttendanceDto(
            String date,
            String clientName,
            Double workHours,
            String remarks,
            boolean lateEarly,
            String startTime,
            String endTime,
            Double restTime
    ) {
    }

    public record AttendanceDto(
            int attendanceRate,
            int lateEarlyCount,
            int paidLeaveRemaining,
            String periodLabel,
            double workDays,
            double workHours,
            List<DailyAttendanceDto> dailyRecords
    ) {
        public AttendanceDto(
                int attendanceRate,
                int lateEarlyCount,
                int paidLeaveRemaining,
                String periodLabel,
                double workDays,
                double workHours
        ) {
            this(attendanceRate, lateEarlyCount, paidLeaveRemaining, periodLabel, workDays, workHours, List.of());
        }

        public AttendanceDto {
            if (dailyRecords == null) {
                dailyRecords = List.of();
            }
        }
    }

    public record EvaluationHistoryDto(String yearLabel, String statusText, String nextEvaluationNote) {
    }

    public record EvaluationCategoryDto(
            String code,
            String label,
            String headerColor,
            String icon,
            List<EvaluationItemDto> items
    ) {
    }

    public record EvaluationItemDto(String itemName, String rankGrade, String comment) {
    }

    public record OverallEvaluationDto(
            String overallRank,
            String rankLabel,
            String continuationText,
            String evaluationDate,
            String evaluatorName,
            String evaluatorDepartment,
            String overallComment,
            String fullEvaluation,
            Integer evaluationLevel
    ) {
    }

    public record SalaryDto(
            int basicSalaryMonthly,
            int commuterAllowance,
            int annualSalary,
            int bonus,
            int overtimeRate,
            String paymentDay,
            int billingUnitPrice,
            int housingAllowance,
            int familyAllowance,
            int fixedOvertimeAllowance,
            int deductionHealthCare,
            int deductionHealth,
            int deductionPension,
            int deductionEmployment,
            int deductionIncomeTax,
            int deductionResidentTax
    ) {
    }

    public record HrDto(
            String hireDate,
            String resignationDate,
            String contractStartDate,
            String contractEndDate,
            String socialInsuranceStatus,
            String employmentInsuranceNo,
            String pensionNo,
            String emergencyContactName,
            String emergencyContactPhone,
            String emergencyContactRelation,
            String paidLeaveStartDate
    ) {
    }

    public EmployeeDetailDto withoutSalaryAndHr() {
        return new EmployeeDetailDto(
                id,
                employeeCode,
                name,
                departmentId,
                departmentName,
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
                evaluationCategories,
                overallEvaluation,
                null,
                null,
                List.of(),
                evaluationCalculation,
                evaluationCalculated,
                version,
                updatedAt,
                updatedByName
        );
    }
}
