package jp.dispatch.employee.service;

import jp.dispatch.employee.dto.EmployeeDetailDto.AttendanceDto;
import jp.dispatch.employee.dto.FileBatchUploadResultDto.AttendanceSyncResultDto;
import jp.dispatch.employee.dto.TimesheetAttendanceUpdateItem;
import jp.dispatch.employee.repository.EmployeeDetailRepository;
import jp.dispatch.employee.repository.EmployeeRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class TimesheetAttendanceSyncService {

    private static final Pattern EMPLOYEE_CODE_PATTERN = Pattern.compile("(?i)(E\\d{3,})");

    private final EmployeeRepository employeeRepository;
    private final EmployeeDetailRepository employeeDetailRepository;

    public TimesheetAttendanceSyncService(
            EmployeeRepository employeeRepository,
            EmployeeDetailRepository employeeDetailRepository
    ) {
        this.employeeRepository = employeeRepository;
        this.employeeDetailRepository = employeeDetailRepository;
    }

    public String extractEmployeeCodeFromFilename(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return null;
        }
        String baseName = fileName.replaceAll("\\.[^.]+$", "");
        Matcher matcher = EMPLOYEE_CODE_PATTERN.matcher(baseName);
        if (matcher.find()) {
            return matcher.group(1).toUpperCase(Locale.ROOT);
        }
        return null;
    }

    public List<AttendanceSyncResultDto> applyUpdates(
            List<TimesheetAttendanceUpdateItem> updates,
            String targetMonth
    ) {
        if (updates == null || updates.isEmpty()) {
            return List.of();
        }
        String periodLabel = toPeriodLabel(targetMonth);
        var results = new ArrayList<AttendanceSyncResultDto>();
        for (TimesheetAttendanceUpdateItem item : updates) {
            results.add(applyOne(item, periodLabel, targetMonth));
        }
        return results;
    }

    private AttendanceSyncResultDto applyOne(
            TimesheetAttendanceUpdateItem item,
            String periodLabel,
            String targetMonth
    ) {
        String fileName = item.fileName() != null ? item.fileName() : "—";
        String employeeCode = normalizeEmployeeCode(item.employeeCode());
        if (employeeCode == null && item.employeeName() != null && !item.employeeName().isBlank()) {
            employeeCode = employeeRepository.findCodeByExactName(item.employeeName()).orElse(null);
        }
        if (employeeCode == null) {
            return new AttendanceSyncResultDto(
                    fileName,
                    null,
                    null,
                    "SKIPPED",
                    "氏名から社員を特定できません"
            );
        }

        var employeeIdOpt = employeeRepository.findIdByEmployeeCode(employeeCode);
        if (employeeIdOpt.isEmpty()) {
            return new AttendanceSyncResultDto(
                    fileName,
                    employeeCode,
                    null,
                    "NOT_FOUND",
                    "社員番号が見つかりません"
            );
        }

        long employeeId = employeeIdOpt.get();
        try {
            employeeDetailRepository.syncAttendanceFromTimesheet(
                    employeeId,
                    new AttendanceDto(
                            item.attendanceRate(),
                            item.lateEarlyCount(),
                            item.paidLeaveRemaining() != null ? item.paidLeaveRemaining() : 0,
                            periodLabel,
                            item.workDays() != null ? item.workDays() : 0,
                            item.workHours() != null ? item.workHours() : 0,
                            item.dailyRecords()
                    ),
                    targetMonth,
                    item.paidLeaveRemaining() == null
            );
            return new AttendanceSyncResultDto(
                    fileName,
                    employeeCode,
                    employeeId,
                    "UPDATED",
                    "勤怠情報を更新しました"
            );
        } catch (RuntimeException ex) {
            return new AttendanceSyncResultDto(
                    fileName,
                    employeeCode,
                    employeeId,
                    "ERROR",
                    ex.getMessage() != null ? ex.getMessage() : "勤怠更新に失敗しました"
            );
        }
    }

    private static String normalizeEmployeeCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return code.trim().toUpperCase(Locale.ROOT);
    }

    static String toPeriodLabel(String targetMonth) {
        if (targetMonth == null || !targetMonth.matches("\\d{4}-\\d{2}")) {
            return null;
        }
        String[] parts = targetMonth.split("-");
        int month = Integer.parseInt(parts[1]);
        return parts[0] + "年" + month + "月";
    }
}
