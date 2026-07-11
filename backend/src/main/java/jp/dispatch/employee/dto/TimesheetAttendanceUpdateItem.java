package jp.dispatch.employee.dto;

import jp.dispatch.employee.dto.EmployeeDetailDto.DailyAttendanceDto;

import java.util.List;

public record TimesheetAttendanceUpdateItem(
        String fileName,
        String employeeCode,
        String employeeName,
        int attendanceRate,
        int lateEarlyCount,
        Integer paidLeaveRemaining,
        Double workDays,
        Double workHours,
        List<DailyAttendanceDto> dailyRecords
) {
    public TimesheetAttendanceUpdateItem {
        if (dailyRecords == null) {
            dailyRecords = List.of();
        }
    }
}
