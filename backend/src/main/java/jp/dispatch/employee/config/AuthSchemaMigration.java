package jp.dispatch.employee.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile("sqlite")
@Order(0)
public class AuthSchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public AuthSchemaMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!tableExists("auth_user")) {
            return;
        }
        if (!hasColumn("auth_user", "department_id")) {
            jdbc.execute("ALTER TABLE auth_user ADD COLUMN department_id INTEGER REFERENCES department(id)");
        }
        if (!hasColumn("auth_user", "email")) {
            jdbc.execute("ALTER TABLE auth_user ADD COLUMN email TEXT");
        }
        if (!hasColumn("auth_user", "totp_secret")) {
            jdbc.execute("ALTER TABLE auth_user ADD COLUMN totp_secret TEXT");
        }
        if (!hasColumn("auth_user", "totp_enabled")) {
            jdbc.execute("ALTER TABLE auth_user ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0");
        }
        jdbc.update(
                """
                UPDATE auth_user
                SET display_name = ?
                WHERE username = ?
                  AND display_name IN (?, ?)
                """,
                "営業",
                "sales",
                "营业部长",
                "营业"
        );
        jdbc.update(
                """
                UPDATE auth_user
                SET display_name = ?
                WHERE username = ?
                  AND display_name IN (?, ?)
                """,
                "事業一部長",
                "div1",
                "事業一部长",
                "事业一部长"
        );
        jdbc.update(
                """
                UPDATE auth_user
                SET display_name = ?
                WHERE username = ?
                  AND display_name IN (?, ?)
                """,
                "開発一部長",
                "dept1",
                "开发1部长",
                "開発1部长"
        );
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?",
                Integer.class,
                tableName
        );
        return count != null && count > 0;
    }

    private boolean hasColumn(String tableName, String columnName) {
        return jdbc.query(
                "PRAGMA table_info(" + tableName + ")",
                (rs, rowNum) -> rs.getString("name")
        ).contains(columnName);
    }
}
