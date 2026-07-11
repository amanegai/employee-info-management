package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.dto.MeetingRoomReservationDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class MeetingRoomReservationRepository {

    private final JdbcTemplate jdbc;

    public MeetingRoomReservationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<MeetingRoomReservationDto> findBetween(
            String rangeStart,
            String rangeEnd,
            Long roomId,
            Long currentUserId
    ) {
        var sql = new StringBuilder("""
                SELECT r.id, r.room_id, mr.name AS room_name, r.title, r.start_at, r.end_at,
                       r.reserved_by, au.display_name AS reserved_by_name, r.description, r.status,
                       r.created_at, r.updated_at
                FROM meeting_room_reservation r
                JOIN meeting_room mr ON mr.id = r.room_id
                JOIN auth_user au ON au.id = r.reserved_by
                WHERE r.status = 'CONFIRMED'
                  AND r.start_at < ?
                  AND r.end_at > ?
                """);
        var params = new ArrayList<Object>();
        params.add(rangeEnd);
        params.add(rangeStart);
        if (roomId != null && roomId > 0) {
            sql.append(" AND r.room_id = ?");
            params.add(roomId);
        }
        sql.append(" ORDER BY r.start_at, r.id");
        long userId = currentUserId != null ? currentUserId : -1;
        return jdbc.query(sql.toString(), (rs, rowNum) -> mapReservation(rs, userId), params.toArray());
    }

    public Optional<MeetingRoomReservationDto> findById(long id, Long currentUserId) {
        var rows = jdbc.query(
                """
                SELECT r.id, r.room_id, mr.name AS room_name, r.title, r.start_at, r.end_at,
                       r.reserved_by, au.display_name AS reserved_by_name, r.description, r.status,
                       r.created_at, r.updated_at
                FROM meeting_room_reservation r
                JOIN meeting_room mr ON mr.id = r.room_id
                JOIN auth_user au ON au.id = r.reserved_by
                WHERE r.id = ?
                """,
                (rs, rowNum) -> mapReservation(rs, currentUserId != null ? currentUserId : -1),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public int countConflicts(long roomId, String startAt, String endAt, Long excludeId) {
        var sql = new StringBuilder("""
                SELECT COUNT(*)
                FROM meeting_room_reservation
                WHERE room_id = ?
                  AND status = 'CONFIRMED'
                  AND start_at < ?
                  AND end_at > ?
                """);
        var params = new ArrayList<Object>();
        params.add(roomId);
        params.add(endAt);
        params.add(startAt);
        if (excludeId != null && excludeId > 0) {
            sql.append(" AND id <> ?");
            params.add(excludeId);
        }
        Integer count = jdbc.queryForObject(sql.toString(), Integer.class, params.toArray());
        return count != null ? count : 0;
    }

    public long insert(
            long roomId,
            String title,
            String startAt,
            String endAt,
            long reservedBy,
            String description,
            String timestamp
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    """
                    INSERT INTO meeting_room_reservation (
                        room_id, title, start_at, end_at, reserved_by, description, status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setLong(1, roomId);
            ps.setString(2, title);
            ps.setString(3, startAt);
            ps.setString(4, endAt);
            ps.setLong(5, reservedBy);
            ps.setString(6, description);
            ps.setString(7, timestamp);
            ps.setString(8, timestamp);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "会議室予約の作成に失敗しました");
    }

    public boolean update(
            long id,
            String title,
            String startAt,
            String endAt,
            String description,
            String timestamp
    ) {
        return jdbc.update(
                """
                UPDATE meeting_room_reservation SET
                    title = ?, start_at = ?, end_at = ?, description = ?, updated_at = ?
                WHERE id = ? AND status = 'CONFIRMED'
                """,
                title,
                startAt,
                endAt,
                description,
                timestamp,
                id
        ) > 0;
    }

    public boolean cancel(long id, String timestamp) {
        return jdbc.update(
                """
                UPDATE meeting_room_reservation SET status = 'CANCELLED', updated_at = ?
                WHERE id = ? AND status = 'CONFIRMED'
                """,
                timestamp,
                id
        ) > 0;
    }

    public int deleteByRoomId(long roomId) {
        return jdbc.update("DELETE FROM meeting_room_reservation WHERE room_id = ?", roomId);
    }

    public Optional<Long> findReservedBy(long id) {
        var rows = jdbc.query(
                "SELECT reserved_by FROM meeting_room_reservation WHERE id = ?",
                (rs, rowNum) -> rs.getLong("reserved_by"),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    private MeetingRoomReservationDto mapReservation(ResultSet rs, long currentUserId) throws SQLException {
        long reservedBy = rs.getLong("reserved_by");
        return new MeetingRoomReservationDto(
                rs.getLong("id"),
                rs.getLong("room_id"),
                rs.getString("room_name"),
                rs.getString("title"),
                rs.getString("start_at"),
                rs.getString("end_at"),
                reservedBy,
                rs.getString("reserved_by_name"),
                rs.getString("description"),
                rs.getString("status"),
                currentUserId > 0 && reservedBy == currentUserId,
                rs.getString("created_at"),
                rs.getString("updated_at")
        );
    }
}
