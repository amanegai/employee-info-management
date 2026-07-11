package jp.dispatch.employee.service;

import java.util.List;
import java.util.Set;

public final class FileCategoryData {

    public static final String TIMESHEET = "TIMESHEET";
    public static final String CERTIFICATE = "CERTIFICATE";
    public static final String CONTRACT = "CONTRACT";
    public static final String PAYROLL = "PAYROLL";
    public static final String APPLICATION = "APPLICATION";
    public static final String OTHER = "OTHER";

    public static final List<String> CATEGORIES = List.of(
            TIMESHEET,
            CERTIFICATE,
            CONTRACT,
            PAYROLL,
            APPLICATION,
            OTHER
    );

    private static final Set<String> ALLOWED = Set.copyOf(CATEGORIES);

    private FileCategoryData() {
    }

    public static boolean isAllowed(String category) {
        return category != null && ALLOWED.contains(category);
    }

    public static String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return null;
        }
        String normalized = category.trim().toUpperCase();
        return isAllowed(normalized) ? normalized : null;
    }

    public static String normalizeTargetMonth(String targetMonth) {
        if (targetMonth == null || targetMonth.isBlank()) {
            return null;
        }
        String normalized = targetMonth.trim();
        if (!normalized.matches("\\d{4}-\\d{2}")) {
            return null;
        }
        return normalized;
    }
}
