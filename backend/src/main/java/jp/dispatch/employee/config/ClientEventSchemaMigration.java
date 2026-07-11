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
public class ClientEventSchemaMigration implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    public ClientEventSchemaMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("CREATE TABLE IF NOT EXISTS _schema_patches (name TEXT PRIMARY KEY)");
        addColumnIfMissing("client_event", "event_status", "client_event_status_v1");
        addNullableLongColumnIfMissing("client_event", "client_id", "client_event_client_id_v1");
        ensureReminderLogTable();
        backfillEmptyEventStatus();
    }

    private void ensureReminderLogTable() {
        jdbc.execute(
                """
                CREATE TABLE IF NOT EXISTS client_event_reminder_log (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id        INTEGER NOT NULL REFERENCES client_event(id) ON DELETE CASCADE,
                    employee_id     INTEGER NOT NULL REFERENCES employee(id),
                    reminder_days   INTEGER NOT NULL,
                    event_date      TEXT NOT NULL,
                    sent_at         TEXT NOT NULL,
                    UNIQUE(event_id, employee_id, reminder_days, event_date)
                )
                """
        );
        jdbc.execute(
                "CREATE INDEX IF NOT EXISTS idx_client_event_reminder_event ON client_event_reminder_log(event_id)"
        );
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
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " TEXT NOT NULL DEFAULT '予定'");
        }
        markPatchApplied(patchName);
    }

    private void backfillEmptyEventStatus() {
        if (!hasColumn("client_event", "event_status")) {
            return;
        }
        jdbc.update(
                """
                UPDATE client_event
                SET event_status = '予定'
                WHERE event_status IS NULL OR event_status = ''
                """
        );
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
