package jp.dispatch.employee.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@Profile("sqlite")
public class ClientRecordSchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public ClientRecordSchemaMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("CREATE TABLE IF NOT EXISTS _schema_patches (name TEXT PRIMARY KEY)");
        addColumnIfMissing("client_meeting", "client_contact_person", "client_meeting_contact_person_v1");
        addColumnIfMissing("client_meeting", "issues_summary", "client_meeting_issues_summary_v1");
        addNullableLongColumnIfMissing("client_meeting", "client_id", "client_meeting_client_id_v1");
    }

    private void addNullableLongColumnIfMissing(String table, String column, String patchName) {
        if (isPatchApplied(patchName)) {
            return;
        }
        if (!hasColumn(table, column)) {
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " INTEGER");
        }
        markPatchApplied(patchName);
    }

    private void addColumnIfMissing(String table, String column, String patchName) {
        if (isPatchApplied(patchName)) {
            return;
        }
        if (!hasColumn(table, column)) {
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " TEXT");
        }
        markPatchApplied(patchName);
    }

    private boolean isPatchApplied(String patchName) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM _schema_patches WHERE name = ?",
                Integer.class,
                patchName
        );
        return count != null && count > 0;
    }

    private void markPatchApplied(String patchName) {
        jdbc.update("INSERT OR IGNORE INTO _schema_patches (name) VALUES (?)", patchName);
    }

    private boolean hasColumn(String table, String column) {
        List<Map<String, Object>> rows = jdbc.queryForList("PRAGMA table_info(" + table + ")");
        return rows.stream().anyMatch(row -> column.equalsIgnoreCase(String.valueOf(row.get("name"))));
    }
}
