package jp.dispatch.employee.dto;

import java.util.List;

public record BulkPayrollMailResultDto(
        int sentCount,
        int skippedCount,
        int failedCount,
        boolean mailConfigured,
        List<BulkPayrollMailItemResultDto> items
) {
    public record BulkPayrollMailItemResultDto(
            long employeeId,
            String employeeCode,
            String employeeName,
            String status,
            String message
    ) {
    }
}
