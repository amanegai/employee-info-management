package jp.dispatch.employee.repository;

import jp.dispatch.employee.dto.AuditLogDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class AuditLogRepository {

    private final JdbcTemplate jdbc;

    public AuditLogRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(
            Long userId,
            String username,
            String action,
            String entityType,
            String entityId,
            String detail,
            String ipAddress,
            String occurredAt
    ) {
        jdbc.update(
                """
                INSERT INTO audit_log (occurred_at, user_id, username, action, entity_type, entity_id, detail, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                occurredAt,
                userId,
                username,
                action,
                entityType,
                entityId,
                detail,
                ipAddress
        );
    }

    public List<AuditLogDto> findRecent(int limit, String action) {
        var sql = new StringBuilder(
                """
                SELECT id, occurred_at, user_id, username, action, entity_type, entity_id, detail, ip_address
                FROM audit_log
                WHERE 1=1
                """
        );
        var params = new ArrayList<Object>();
        if (action != null && !action.isBlank()) {
            sql.append(" AND action = ?");
            params.add(action.trim());
        }
        sql.append(" ORDER BY id DESC LIMIT ?");
        params.add(Math.min(Math.max(limit, 1), 500));
        return jdbc.query(
                sql.toString(),
                (rs, rowNum) -> new AuditLogDto(
                        rs.getLong("id"),
                        rs.getString("occurred_at"),
                        rs.getObject("user_id") != null ? rs.getLong("user_id") : null,
                        rs.getString("username"),
                        rs.getString("action"),
                        rs.getString("entity_type"),
                        rs.getString("entity_id"),
                        rs.getString("detail"),
                        rs.getString("ip_address")
                ),
                params.toArray()
        );
    }
}
