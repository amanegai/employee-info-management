package jp.dispatch.employee.audit;

public final class AuditAction {

    private AuditAction() {
    }

    public static final String LOGIN = "LOGIN";
    public static final String MFA_VERIFY = "MFA_VERIFY";
    public static final String MFA_RECOVERY_USED = "MFA_RECOVERY_USED";
    public static final String MFA_ENABLE = "MFA_ENABLE";
    public static final String MFA_DISABLE = "MFA_DISABLE";
    public static final String MFA_RECOVERY_REGENERATE = "MFA_RECOVERY_REGENERATE";
    public static final String USER_CREATE = "USER_CREATE";
    public static final String USER_UPDATE = "USER_UPDATE";
    public static final String USER_DELETE = "USER_DELETE";
    public static final String EMPLOYEE_CREATE = "EMPLOYEE_CREATE";
    public static final String EMPLOYEE_UPDATE = "EMPLOYEE_UPDATE";
    public static final String EMPLOYEE_DELETE = "EMPLOYEE_DELETE";
    public static final String CONFIRM_HIRE = "CONFIRM_HIRE";
    public static final String SUGGESTION_APPLY = "SUGGESTION_APPLY";
    public static final String SUGGESTION_DISMISS = "SUGGESTION_DISMISS";
    public static final String ASSIGNMENT_CANCEL = "ASSIGNMENT_CANCEL";
    public static final String STATUS_MAINTENANCE = "STATUS_MAINTENANCE";
    public static final String FILE_UPLOAD = "FILE_UPLOAD";
    public static final String FILE_DELETE = "FILE_DELETE";
    public static final String CLIENT_CREATE = "CLIENT_CREATE";
    public static final String CLIENT_UPDATE = "CLIENT_UPDATE";
    public static final String CLIENT_DELETE = "CLIENT_DELETE";
    public static final String HR_OPS_CLIENT_MAIL = "HR_OPS_CLIENT_MAIL";
    public static final String HR_OPS_PAYROLL_BULK_MAIL = "HR_OPS_PAYROLL_BULK_MAIL";
}
