package jp.dispatch.employee.service;

import jp.dispatch.employee.dto.ExpenseApplicationUpdateItem;
import jp.dispatch.employee.dto.FileBatchUploadResultDto.ExpenseSyncResultDto;
import jp.dispatch.employee.repository.EmployeeDetailRepository;
import jp.dispatch.employee.repository.EmployeeRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class ExpenseApplicationSyncService {

    private static final Pattern EXPENSE_FILENAME_PATTERN =
            Pattern.compile("^申請書_(E\\d{3,})_([^_]+)_経費申請_(\\d{4}-\\d{2})$", Pattern.CASE_INSENSITIVE);

    private final EmployeeRepository employeeRepository;
    private final EmployeeDetailRepository employeeDetailRepository;

    public ExpenseApplicationSyncService(
            EmployeeRepository employeeRepository,
            EmployeeDetailRepository employeeDetailRepository
    ) {
        this.employeeRepository = employeeRepository;
        this.employeeDetailRepository = employeeDetailRepository;
    }

    public boolean isExpenseApplicationFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return false;
        }
        String baseName = fileName.replaceAll("\\.[^.]+$", "");
        return EXPENSE_FILENAME_PATTERN.matcher(baseName).matches();
    }

    public List<ExpenseSyncResultDto> applyUpdates(List<ExpenseApplicationUpdateItem> updates) {
        if (updates == null || updates.isEmpty()) {
            return List.of();
        }
        var results = new ArrayList<ExpenseSyncResultDto>();
        for (ExpenseApplicationUpdateItem item : updates) {
            results.add(applyOne(item));
        }
        return results;
    }

    private ExpenseSyncResultDto applyOne(ExpenseApplicationUpdateItem item) {
        String fileName = item.fileName() != null ? item.fileName() : "—";
        String employeeCode = normalizeEmployeeCode(item.employeeCode());
        if (employeeCode == null && item.employeeName() != null && !item.employeeName().isBlank()) {
            employeeCode = employeeRepository.findCodeByExactName(item.employeeName()).orElse(null);
        }
        if (employeeCode == null) {
            return new ExpenseSyncResultDto(
                    fileName,
                    null,
                    null,
                    "SKIPPED",
                    "氏名から社員を特定できません"
            );
        }

        var employeeIdOpt = employeeRepository.findIdByEmployeeCode(employeeCode);
        if (employeeIdOpt.isEmpty()) {
            return new ExpenseSyncResultDto(
                    fileName,
                    employeeCode,
                    null,
                    "NOT_FOUND",
                    "社員番号が見つかりません"
            );
        }

        String targetMonth = item.targetMonth();
        if (targetMonth == null || !targetMonth.matches("\\d{4}-\\d{2}")) {
            return new ExpenseSyncResultDto(
                    fileName,
                    employeeCode,
                    employeeIdOpt.get(),
                    "SKIPPED",
                    "対象年月が不正です"
            );
        }

        long employeeId = employeeIdOpt.get();
        try {
            employeeDetailRepository.syncMonthlyExpenseFromApplication(
                    employeeId,
                    targetMonth,
                    item.periodicPassAllowance(),
                    item.commuterIndividualAllowance(),
                    item.businessExpenseAllowance(),
                    fileName,
                    null
            );
            return new ExpenseSyncResultDto(
                    fileName,
                    employeeCode,
                    employeeId,
                    "UPDATED",
                    String.format(
                            "%s の経費情報を更新しました（定期券 %,d / 通勤手当 %,d / 営業費 %,d）",
                            targetMonth,
                            item.periodicPassAllowance(),
                            item.commuterIndividualAllowance(),
                            item.businessExpenseAllowance()
                    )
            );
        } catch (RuntimeException ex) {
            return new ExpenseSyncResultDto(
                    fileName,
                    employeeCode,
                    employeeId,
                    "ERROR",
                    ex.getMessage() != null ? ex.getMessage() : "経費更新に失敗しました"
            );
        }
    }

    private static String normalizeEmployeeCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return code.trim().toUpperCase(Locale.ROOT);
    }
}
