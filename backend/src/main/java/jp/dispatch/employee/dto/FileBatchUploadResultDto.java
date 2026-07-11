package jp.dispatch.employee.dto;

import java.util.List;

public record FileBatchUploadResultDto(
        List<FileAttachmentDto> uploaded,
        List<BatchFileFailureDto> failures,
        List<AttendanceSyncResultDto> attendanceResults,
        List<ExpenseSyncResultDto> expenseResults
) {
    public FileBatchUploadResultDto(
            List<FileAttachmentDto> uploaded,
            List<BatchFileFailureDto> failures,
            List<AttendanceSyncResultDto> attendanceResults
    ) {
        this(uploaded, failures, attendanceResults, List.of());
    }

    public record BatchFileFailureDto(String fileName, String error) {
    }

    public record AttendanceSyncResultDto(
            String fileName,
            String employeeCode,
            Long employeeId,
            String status,
            String message
    ) {
    }

    public record ExpenseSyncResultDto(
            String fileName,
            String employeeCode,
            Long employeeId,
            String status,
            String message
    ) {
    }
}
