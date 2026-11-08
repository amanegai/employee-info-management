package jp.dispatch.employee.model;

import java.util.List;

public final class MasterData {

    public static final String HR_DEPARTMENT_NAME = "人事部";
    public static final String SALES_DEPARTMENT_NAME = "営業部";
    public static final String ALESIS_DEPARTMENT_NAME = EmployeeCodeRules.DEPT_ALESIS;
    public static final String SONOTA_DEPARTMENT_NAME = EmployeeCodeRules.DEPT_SONOTA;

    public static final List<String> POSITIONS = List.of(
            "社員",
            "リーター",
            "代理開発部長",
            "開発部長",
            "事業部長",
            "営業部長",
            "人事部長",
            "社長",
            "顧問"
    );

    public static final List<String> ASSIGNMENT_ROLES = AssignmentRoleCodes.ALL;

    /** 議事録・イベント出席者：営業部またはリーター以上 */
    public static final List<String> POSITIONS_LEADER_AND_ABOVE = List.of(
            "リーター",
            "代理開発部長",
            "開発部長",
            "事業部長",
            "営業部長",
            "人事部長",
            "社長",
            "顧問"
    );

    /** 取引先自社担当：代理部長相当以上（リーター未満は対象外） */
    public static final List<String> POSITIONS_DEPUTY_DIRECTOR_AND_ABOVE = List.of(
            "代理開発部長",
            "開発部長",
            "事業部長",
            "営業部長",
            "人事部長",
            "社長",
            "顧問"
    );

    public static final List<String> EMPLOYEE_TYPES = List.of(
            "正社員", "契約社員", "個人事業主", "BP"
    );

    public static final List<String> WORK_STATUSES = List.of(
            "稼働中", "待機中", "休業", "退職予定", "退職", "案件終了間近"
    );

    public static final List<String> EVALUATION_GRADES = List.of("S", "A", "B", "C", "D");

    /** 取引先自社担当：営業部の社員、または代理部長相当以上 */
    public static void appendEligibleInternalContactCondition(StringBuilder sql) {
        sql.append("""
                  AND (
                      d.name = '"""
        );
        sql.append(SALES_DEPARTMENT_NAME.replace("'", "''"));
        sql.append("""
                      '
                      OR e.position IN (
                """);
        for (int i = 0; i < POSITIONS_DEPUTY_DIRECTOR_AND_ABOVE.size(); i++) {
            if (i > 0) {
                sql.append(", ");
            }
            sql.append("'").append(POSITIONS_DEPUTY_DIRECTOR_AND_ABOVE.get(i).replace("'", "''")).append("'");
        }
        sql.append("""
                      )
                      OR e.position LIKE '%代理部長%'
                      OR e.position LIKE '%代理%部長%'
                  )
                """);
    }

    /** 営業部またはリーター以上（既存データの旧役職名も LIKE で許容） */
    public static void appendEligibleAttendeePositionCondition(StringBuilder sql) {
        sql.append("""
                  AND (
                      d.name = '営業部'
                      OR e.position IN (
                """);
        for (int i = 0; i < POSITIONS_LEADER_AND_ABOVE.size(); i++) {
            if (i > 0) {
                sql.append(", ");
            }
            sql.append("'").append(POSITIONS_LEADER_AND_ABOVE.get(i).replace("'", "''")).append("'");
        }
        sql.append("""
                      )
                      OR e.position LIKE '%部長%'
                      OR e.position LIKE '%リーダー%'
                      OR e.position LIKE '%リータ%'
                      OR e.position LIKE '%代理%'
                  )
                """);
    }

    public static List<String> allEvaluations() {
        return EVALUATION_GRADES.stream()
                .flatMap(grade -> java.util.stream.IntStream.rangeClosed(1, 5)
                        .mapToObj(i -> grade + i))
                .toList();
    }

    private MasterData() {
    }
}
