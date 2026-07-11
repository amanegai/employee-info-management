package jp.dispatch.employee.auth;

public final class AuthRoles {
    public static final String ADMIN = "ADMIN";
    public static final String HR = "HR";
    public static final String USER = "USER";
    /** 事業部長：自事業部配下の全社員を閲覧可 */
    public static final String DIVISION_HEAD = "DIVISION_HEAD";
    /** 部長：自部門の社員のみ閲覧可 */
    public static final String DEPT_HEAD = "DEPT_HEAD";
    /** 営業：全社員を閲覧可（人事部を除く） */
    public static final String SALES_HEAD = "SALES_HEAD";

    private AuthRoles() {
    }
}
