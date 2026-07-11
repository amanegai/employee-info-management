package jp.dispatch.employee.dto;

public final class EmployeeFieldNormalizer {

    private EmployeeFieldNormalizer() {
    }

    public static Long normalizeDepartmentId(Long departmentId) {
        if (departmentId == null || departmentId <= 0) {
            return null;
        }
        return departmentId;
    }

    public static String normalizeOptionalText(String value) {
        return value == null ? "" : value.trim();
    }
}
