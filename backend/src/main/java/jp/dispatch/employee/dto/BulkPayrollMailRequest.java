package jp.dispatch.employee.dto;

import java.util.List;

public record BulkPayrollMailRequest(
        String targetMonth,
        List<Long> employeeIds,
        String extraMessage
) {
}
