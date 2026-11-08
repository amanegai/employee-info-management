package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.dto.AppNotificationDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;

@Repository
public class AppNotificationRepository {

    private final JdbcTemplate jdbc;

    public AppNotificationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long insert(
            long recipientUserId,
            String type,
            String title,
            String body,
            String linkPath,
            Long projectId,
            Long actorUserId,
            String createdAt
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    """
                    INSERT INTO app_notification (
                        recipient_user_id, type, title, body, link_path, project_id, actor_user_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setLong(1, recipientUserId);
            ps.setString(2, type);
            ps.setString(3, title);
            ps.setString(4, body);
            ps.setString(5, linkPath);
            if (projectId != null) {
                ps.setLong(6, projectId);
            } else {
                ps.setNull(6, java.sql.Types.BIGINT);
            }
            if (actorUserId != null) {
                ps.setLong(7, actorUserId);
            } else {
                ps.setNull(7, java.sql.Types.BIGINT);
            }
            ps.setString(8, createdAt);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "通知の作成に失敗しました");
    }

    public List<AppNotificationDto> findForRecipient(long recipientUserId, boolean unreadOnly, int limit) {
        var sql = new StringBuilder("""
                SELECT n.id, n.type, n.title, n.body, n.link_path, n.project_id, n.actor_user_id,
                       au.display_name AS actor_display_name, n.read_at, n.resolved_at, n.created_at
                FROM app_notification n
                LEFT JOIN auth_user au ON au.id = n.actor_user_id
                WHERE n.recipient_user_id = ?
                  AND n.resolved_at IS NULL
                """);
        var params = new ArrayList<Object>();
        params.add(recipientUserId);
        if (unreadOnly) {
            sql.append(" AND n.read_at IS NULL");
        }
        sql.append(" ORDER BY n.created_at DESC, n.id DESC LIMIT ?");
        params.add(Math.max(1, Math.min(limit, 100)));
        return jdbc.query(sql.toString(), (rs, rowNum) -> mapRow(rs), params.toArray());
    }

    public int countUnread(long recipientUserId) {
        Integer count = jdbc.queryForObject(
                """
                SELECT COUNT(*)
                FROM app_notification
                WHERE recipient_user_id = ?
                  AND read_at IS NULL
                  AND resolved_at IS NULL
                """,
                Integer.class,
                recipientUserId
        );
        return count == null ? 0 : count;
    }

    public boolean markRead(long id, long recipientUserId, String readAt) {
        return jdbc.update(
                """
                UPDATE app_notification
                SET read_at = COALESCE(read_at, ?)
                WHERE id = ? AND recipient_user_id = ? AND resolved_at IS NULL
                """,
                readAt,
                id,
                recipientUserId
        ) > 0;
    }

    public int markAllRead(long recipientUserId, String readAt) {
        return jdbc.update(
                """
                UPDATE app_notification
                SET read_at = COALESCE(read_at, ?)
                WHERE recipient_user_id = ? AND read_at IS NULL AND resolved_at IS NULL
                """,
                readAt,
                recipientUserId
        );
    }

    public int markProjectRead(long recipientUserId, long projectId, String type, String readAt) {
        return jdbc.update(
                """
                UPDATE app_notification
                SET read_at = COALESCE(read_at, ?)
                WHERE recipient_user_id = ?
                  AND project_id = ?
                  AND type = ?
                  AND read_at IS NULL
                  AND resolved_at IS NULL
                """,
                readAt,
                recipientUserId,
                projectId,
                type
        );
    }

    public int resolveByProjectAndType(long projectId, String type, String resolvedAt) {
        return jdbc.update(
                """
                UPDATE app_notification
                SET resolved_at = ?,
                    read_at = COALESCE(read_at, ?)
                WHERE project_id = ?
                  AND type = ?
                  AND resolved_at IS NULL
                """,
                resolvedAt,
                resolvedAt,
                projectId,
                type
        );
    }

    private static AppNotificationDto mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        String readAt = rs.getString("read_at");
        String resolvedAt = rs.getString("resolved_at");
        long projectId = rs.getLong("project_id");
        Long projectIdObj = rs.wasNull() ? null : projectId;
        long actorId = rs.getLong("actor_user_id");
        Long actorIdObj = rs.wasNull() ? null : actorId;
        return new AppNotificationDto(
                rs.getLong("id"),
                rs.getString("type"),
                rs.getString("title"),
                rs.getString("body"),
                rs.getString("link_path"),
                projectIdObj,
                actorIdObj,
                rs.getString("actor_display_name"),
                readAt,
                resolvedAt,
                rs.getString("created_at"),
                readAt == null && resolvedAt == null
        );
    }
}
