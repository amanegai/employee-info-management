package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.dto.MeetingRoomDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class MeetingRoomRepository {

    private final JdbcTemplate jdbc;

    public MeetingRoomRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<MeetingRoomDto> findAllActive() {
        return jdbc.query(
                """
                SELECT id, name, floor, capacity, equipment, slot_minutes, business_start, business_end,
                       is_active, sort_order, created_at, updated_at
                FROM meeting_room
                WHERE is_active = TRUE
                ORDER BY sort_order, id
                """,
                this::mapRoom
        );
    }

    public List<MeetingRoomDto> findAll() {
        return jdbc.query(
                """
                SELECT id, name, floor, capacity, equipment, slot_minutes, business_start, business_end,
                       is_active, sort_order, created_at, updated_at
                FROM meeting_room
                ORDER BY sort_order, id
                """,
                this::mapRoom
        );
    }

    public boolean existsByNormalizedNameAndFloor(String name, String floor, Long excludeId) {
        String normalizedFloor = floor != null ? floor : "";
        if (excludeId != null) {
            Integer count = jdbc.queryForObject(
                    """
                    SELECT COUNT(*) FROM meeting_room
                    WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
                      AND LOWER(TRIM(COALESCE(floor, ''))) = LOWER(TRIM(?))
                      AND id <> ?
                    """,
                    Integer.class,
                    name,
                    normalizedFloor,
                    excludeId
            );
            return count != null && count > 0;
        }
        Integer count = jdbc.queryForObject(
                """
                SELECT COUNT(*) FROM meeting_room
                WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
                  AND LOWER(TRIM(COALESCE(floor, ''))) = LOWER(TRIM(?))
                """,
                Integer.class,
                name,
                normalizedFloor
        );
        return count != null && count > 0;
    }

    public int findMaxSortOrder() {
        Integer max = jdbc.queryForObject(
                "SELECT COALESCE(MAX(sort_order), -1) FROM meeting_room",
                Integer.class
        );
        return max != null ? max : -1;
    }

    public Optional<MeetingRoomDto> findById(long id) {
        var rows = jdbc.query(
                """
                SELECT id, name, floor, capacity, equipment, slot_minutes, business_start, business_end,
                       is_active, sort_order, created_at, updated_at
                FROM meeting_room
                WHERE id = ?
                """,
                this::mapRoom,
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public long insert(
            String name,
            String floor,
            Integer capacity,
            String equipment,
            int slotMinutes,
            String businessStart,
            String businessEnd,
            boolean active,
            int sortOrder,
            String timestamp
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    """
                    INSERT INTO meeting_room (
                        name, floor, capacity, equipment, slot_minutes, business_start, business_end,
                        is_active, sort_order, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setString(1, name);
            ps.setString(2, floor);
            if (capacity != null) {
                ps.setInt(3, capacity);
            } else {
                ps.setNull(3, java.sql.Types.INTEGER);
            }
            ps.setString(4, equipment);
            ps.setInt(5, slotMinutes);
            ps.setString(6, businessStart);
            ps.setString(7, businessEnd);
            ps.setBoolean(8, active);
            ps.setInt(9, sortOrder);
            ps.setString(10, timestamp);
            ps.setString(11, timestamp);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "会議室の作成に失敗しました");
    }

    public boolean update(
            long id,
            String name,
            String floor,
            Integer capacity,
            String equipment,
            int slotMinutes,
            String businessStart,
            String businessEnd,
            boolean active,
            int sortOrder,
            String timestamp
    ) {
        return jdbc.update(
                """
                UPDATE meeting_room SET
                    name = ?, floor = ?, capacity = ?, equipment = ?, slot_minutes = ?,
                    business_start = ?, business_end = ?, is_active = ?, sort_order = ?, updated_at = ?
                WHERE id = ?
                """,
                name,
                floor,
                capacity,
                equipment,
                slotMinutes,
                businessStart,
                businessEnd,
                active,
                sortOrder,
                timestamp,
                id
        ) > 0;
    }

    public boolean deleteById(long id) {
        return jdbc.update("DELETE FROM meeting_room WHERE id = ?", id) > 0;
    }

    private MeetingRoomDto mapRoom(ResultSet rs, int rowNum) throws SQLException {
        int capacityValue = rs.getInt("capacity");
        Integer capacity = rs.wasNull() ? null : capacityValue;
        return new MeetingRoomDto(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("floor"),
                capacity,
                rs.getString("equipment"),
                rs.getInt("slot_minutes"),
                rs.getString("business_start"),
                rs.getString("business_end"),
                rs.getBoolean("is_active"),
                rs.getInt("sort_order"),
                rs.getString("created_at"),
                rs.getString("updated_at")
        );
    }
}
