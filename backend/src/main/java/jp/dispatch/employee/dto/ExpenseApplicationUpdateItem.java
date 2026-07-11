package jp.dispatch.employee.dto;

public record ExpenseApplicationUpdateItem(
        String fileName,
        String employeeCode,
        String employeeName,
        String targetMonth,
        int periodicPassAllowance,
        int commuterIndividualAllowance,
        int businessExpenseAllowance
) {
}
