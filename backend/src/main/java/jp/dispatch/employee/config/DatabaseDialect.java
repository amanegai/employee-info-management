package jp.dispatch.employee.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatabaseDialect {

    private final boolean postgres;

    public DatabaseDialect(@Value("${spring.datasource.url:}") String url) {
        this.postgres = url != null && url.startsWith("jdbc:postgresql:");
    }

    public boolean isPostgres() {
        return postgres;
    }

    /** SQL fragment: {column} compared case-insensitively to ? */
    public String likeIgnoreCase(String column) {
        return postgres ? column + " ILIKE ?" : column + " LIKE ? COLLATE NOCASE";
    }

    public String equalsIgnoreCase(String column) {
        return "LOWER(" + column + ") = LOWER(?)";
    }

    public String employeeCodeNumericFilter() {
        return postgres ? "employee_code ~ '^E[0-9]+$'" : "employee_code GLOB 'E[0-9]*'";
    }

    public String currentLocalDateExpression() {
        return postgres ? "CURRENT_DATE" : "date('now', 'localtime')";
    }

    /** TEXT 型 ISO 日付列を DB 日付として比較（PostgreSQL 移行後の TEXT 列向け） */
    public String castTextDate(String columnExpression) {
        return postgres ? columnExpression + "::date" : columnExpression;
    }

    /** TEXT 日付列が本日より後か */
    public String textDateAfterCurrentLocalDate(String columnExpression) {
        return castTextDate(columnExpression) + " > " + currentLocalDateExpression();
    }

    /** TEXT 日付列がパラメータ日付より前か（プレースホルダ 1 つ） */
    public String textDateLessThanParam(String columnExpression) {
        return postgres
                ? castTextDate(columnExpression) + " < ?::date"
                : columnExpression + " < ?";
    }

    /** TEXT 日付列がパラメータ日付以上か（プレースホルダ 1 つ） */
    public String textDateGreaterOrEqualParam(String columnExpression) {
        return postgres
                ? castTextDate(columnExpression) + " >= ?::date"
                : columnExpression + " >= ?";
    }

    /** TEXT 日付列がパラメータ日付以下か（プレースホルダ 1 つ） */
    public String textDateLessOrEqualParam(String columnExpression) {
        return postgres
                ? castTextDate(columnExpression) + " <= ?::date"
                : columnExpression + " <= ?";
    }

    /** TEXT 日付列がパラメータ日付より後か（プレースホルダ 1 つ） */
    public String textDateGreaterThanParam(String columnExpression) {
        return postgres
                ? castTextDate(columnExpression) + " > ?::date"
                : columnExpression + " > ?";
    }

    /** TEXT 日付列がパラメータ日付と一致するか（プレースホルダ 1 つ） */
    public String textDateEqualParam(String columnExpression) {
        return postgres
                ? castTextDate(columnExpression) + " = ?::date"
                : columnExpression + " = ?";
    }

    /**
     * {@code AND (alias.department_id IS NULL OR alias.department_id IN (?, ...))}
     * 未配属社員も部門スコープ内で閲覧可能にする。
     */
    public void appendEmployeeDepartmentScope(
            StringBuilder sql,
            List<Object> params,
            List<Long> scopeDepartmentIds,
            String tableAlias
    ) {
        if (scopeDepartmentIds == null) {
            return;
        }
        if (scopeDepartmentIds.isEmpty()) {
            sql.append(" AND 1=0");
            return;
        }
        String column = tableAlias == null || tableAlias.isBlank()
                ? "department_id"
                : tableAlias + ".department_id";
        sql.append(" AND (").append(column).append(" IS NULL OR ").append(column).append(" IN (");
        sql.append("?,".repeat(scopeDepartmentIds.size()));
        sql.setLength(sql.length() - 1);
        sql.append(")) ");
        params.addAll(scopeDepartmentIds);
    }

    public String insertReminderLogSql() {
        if (postgres) {
            return """
                    INSERT INTO client_event_reminder_log (
                        event_id, employee_id, reminder_days, event_date, sent_at
                    ) VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT (event_id, employee_id, reminder_days, event_date) DO NOTHING
                    """;
        }
        return """
                INSERT OR IGNORE INTO client_event_reminder_log (
                    event_id, employee_id, reminder_days, event_date, sent_at
                ) VALUES (?, ?, ?, ?, ?)
                """;
    }
}
