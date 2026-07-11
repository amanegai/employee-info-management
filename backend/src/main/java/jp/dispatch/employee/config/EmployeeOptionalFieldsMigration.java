package jp.dispatch.employee.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 履歴書インポート向けに employee の所属部門・役職等を未設定(null/空)で保存できるようテーブルを移行する。
 */
@Component
@Profile("sqlite")
public class EmployeeOptionalFieldsMigration implements ApplicationRunner {

    private static final String PATCH_NAME = "employee_optional_fields_v1";

    private final JdbcTemplate jdbc;

    public EmployeeOptionalFieldsMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("CREATE TABLE IF NOT EXISTS _schema_patches (name TEXT PRIMARY KEY)");
        if (isPatchApplied()) {
            return;
        }
        if (!isDepartmentIdNotNull()) {
            markPatchApplied();
            return;
        }

        jdbc.execute("PRAGMA foreign_keys=OFF");
        try {
            jdbc.execute(
                    """
                    CREATE TABLE employee__optional_migrate (
                        id              INTEGER PRIMARY KEY AUTOINCREMENT,
                        employee_code   TEXT NOT NULL UNIQUE,
                        name            TEXT NOT NULL,
                        department_id   INTEGER REFERENCES department(id),
                        position        TEXT NOT NULL DEFAULT '',
                        employee_type   TEXT NOT NULL DEFAULT '',
                        work_status     TEXT NOT NULL DEFAULT '',
                        unit_price      INTEGER NOT NULL DEFAULT 0,
                        evaluation      TEXT NOT NULL,
                        end_date        TEXT,
                        created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                    )
                    """
            );
            jdbc.update(
                    """
                    INSERT INTO employee__optional_migrate
                        (id, employee_code, name, department_id, position, employee_type, work_status,
                         unit_price, evaluation, end_date, created_at)
                    SELECT id, employee_code, name, department_id, position, employee_type, work_status,
                           unit_price, evaluation, end_date, created_at
                    FROM employee
                    """
            );
            jdbc.execute("DROP TABLE employee");
            jdbc.execute("ALTER TABLE employee__optional_migrate RENAME TO employee");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_employee_department ON employee(department_id)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_employee_work_status ON employee(work_status)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_employee_end_date ON employee(end_date)");
            markPatchApplied();
        } finally {
            jdbc.execute("PRAGMA foreign_keys=ON");
        }
    }

    private boolean isPatchApplied() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM _schema_patches WHERE name = ?",
                Integer.class,
                PATCH_NAME
        );
        return count != null && count > 0;
    }

    private void markPatchApplied() {
        jdbc.update("INSERT OR IGNORE INTO _schema_patches (name) VALUES (?)", PATCH_NAME);
    }

    private boolean isDepartmentIdNotNull() {
        List<Map<String, Object>> columns = jdbc.queryForList("PRAGMA table_info(employee)");
        for (Map<String, Object> column : columns) {
            if ("department_id".equals(column.get("name"))) {
                Object notNull = column.get("notnull");
                return notNull instanceof Number number && number.intValue() == 1;
            }
        }
        return false;
    }
}
