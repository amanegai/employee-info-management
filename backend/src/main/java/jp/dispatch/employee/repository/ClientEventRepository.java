package jp.dispatch.employee.repository;

import jp.dispatch.employee.dto.ClientEventDto;
import jp.dispatch.employee.dto.ClientEventParticipantDto;
import jp.dispatch.employee.dto.EligibleParticipantDto;
import jp.dispatch.employee.config.DatabaseDialect;
import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.model.MasterData;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class ClientEventRepository {

    private final JdbcTemplate jdbc;
    private final DatabaseDialect dialect;

    public ClientEventRepository(JdbcTemplate jdbc, DatabaseDialect dialect) {
        this.jdbc = jdbc;
        this.dialect = dialect;
    }

    public List<ClientEventDto> search(
            String keyword,
            String eventType,
            String eventStatus,
            String dateFrom,
            String dateTo,
            Long participantEmployeeId,
            List<Long> scopeDepartmentIds
    ) {
        var sql = new StringBuilder("""
                SELECT ce.id, ce.client_id, ce.client_name, ce.event_name, ce.event_date, ce.event_time,
                       ce.location, ce.event_type, ce.event_status, ce.notes, ce.created_at, ce.updated_at,
                       au.display_name AS created_by_name
                FROM client_event ce
                LEFT JOIN auth_user au ON au.id = ce.created_by
                WHERE 1=1
                """);
        var params = new ArrayList<Object>();

        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + keyword.trim() + "%";
            sql.append("""
                     AND (
                         """);
            sql.append(dialect.likeIgnoreCase("ce.client_name"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("ce.event_name"));
            sql.append(" OR ");
            sql.append(dialect.likeIgnoreCase("ce.location"));
            sql.append("""
                     )
                    """);
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }
        if (eventType != null && !eventType.isBlank()) {
            sql.append(" AND ce.event_type = ?");
            params.add(eventType.trim());
        }
        if (eventStatus != null && !eventStatus.isBlank()) {
            sql.append(" AND ce.event_status = ?");
            params.add(eventStatus.trim());
        }
        if (dateFrom != null && !dateFrom.isBlank()) {
            sql.append(" AND ").append(dialect.textDateGreaterOrEqualParam("ce.event_date"));
            params.add(dateFrom.trim());
        }
        if (dateTo != null && !dateTo.isBlank()) {
            sql.append(" AND ").append(dialect.textDateLessOrEqualParam("ce.event_date"));
            params.add(dateTo.trim());
        }
        if (participantEmployeeId != null && participantEmployeeId > 0) {
            sql.append("""
                     AND EXISTS (
                         SELECT 1 FROM client_event_participant cep
                         WHERE cep.event_id = ce.id AND cep.employee_id = ?
                     )
                    """);
            params.add(participantEmployeeId);
        }
        appendEventScopeClause(sql, params, scopeDepartmentIds);
        sql.append(" ORDER BY ce.event_date DESC, ce.id DESC");

        List<EventHeaderRow> headers = jdbc.query(
                sql.toString(),
                (rs, rowNum) -> new EventHeaderRow(
                        rs.getLong("id"),
                        readNullableLong(rs, "client_id"),
                        rs.getString("client_name"),
                        rs.getString("event_name"),
                        rs.getString("event_date"),
                        rs.getString("event_time"),
                        rs.getString("location"),
                        rs.getString("event_type"),
                        rs.getString("event_status"),
                        rs.getString("notes"),
                        rs.getString("created_by_name"),
                        rs.getString("created_at"),
                        rs.getString("updated_at")
                ),
                params.toArray()
        );
        return attachParticipants(headers);
    }

    public Optional<ClientEventDto> findById(long id) {
        List<EventHeaderRow> headers = jdbc.query(
                """
                SELECT ce.id, ce.client_id, ce.client_name, ce.event_name, ce.event_date, ce.event_time,
                       ce.location, ce.event_type, ce.event_status, ce.notes, ce.created_at, ce.updated_at,
                       au.display_name AS created_by_name
                FROM client_event ce
                LEFT JOIN auth_user au ON au.id = ce.created_by
                WHERE ce.id = ?
                """,
                (rs, rowNum) -> new EventHeaderRow(
                        rs.getLong("id"),
                        readNullableLong(rs, "client_id"),
                        rs.getString("client_name"),
                        rs.getString("event_name"),
                        rs.getString("event_date"),
                        rs.getString("event_time"),
                        rs.getString("location"),
                        rs.getString("event_type"),
                        rs.getString("event_status"),
                        rs.getString("notes"),
                        rs.getString("created_by_name"),
                        rs.getString("created_at"),
                        rs.getString("updated_at")
                ),
                id
        );
        if (headers.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(attachParticipants(headers).getFirst());
    }

    public long insert(
            Long clientId,
            String clientName,
            String eventName,
            String eventDate,
            String eventTime,
            String location,
            String eventType,
            String eventStatus,
            String notes,
            Long createdBy,
            String timestamp
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    """
                    INSERT INTO client_event (
                        client_id, client_name, event_name, event_date, event_time, location,
                        event_type, event_status, notes, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            if (clientId != null) {
                ps.setLong(1, clientId);
            } else {
                ps.setNull(1, java.sql.Types.BIGINT);
            }
            ps.setString(2, clientName);
            ps.setString(3, eventName);
            ps.setString(4, eventDate);
            ps.setString(5, eventTime);
            ps.setString(6, location);
            ps.setString(7, eventType);
            ps.setString(8, eventStatus);
            ps.setString(9, notes);
            if (createdBy != null && createdBy > 0) {
                ps.setLong(10, createdBy);
            } else {
                ps.setNull(10, java.sql.Types.INTEGER);
            }
            ps.setString(11, timestamp);
            ps.setString(12, timestamp);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "イベントの作成に失敗しました");
    }

    public boolean update(
            long id,
            Long clientId,
            String clientName,
            String eventName,
            String eventDate,
            String eventTime,
            String location,
            String eventType,
            String eventStatus,
            String notes,
            String timestamp
    ) {
        int rows = jdbc.update(
                """
                UPDATE client_event SET
                    client_id = ?, client_name = ?, event_name = ?, event_date = ?, event_time = ?,
                    location = ?, event_type = ?, event_status = ?, notes = ?, updated_at = ?
                WHERE id = ?
                """,
                clientId,
                clientName,
                eventName,
                eventDate,
                eventTime,
                location,
                eventType,
                eventStatus,
                notes,
                timestamp,
                id
        );
        return rows > 0;
    }

    public boolean delete(long id) {
        return jdbc.update("DELETE FROM client_event WHERE id = ?", id) > 0;
    }

    public int completePastScheduledEvents(String today, String timestamp) {
        return jdbc.update(
                """
                UPDATE client_event
                SET event_status = '実施済', updated_at = ?
                WHERE event_status = '予定' """
                + "AND " + dialect.textDateLessThanParam("event_date"),
                timestamp,
                today
        );
    }

    public int completeLegacyPastEvents(String today, String timestamp) {
        return jdbc.update(
                """
                UPDATE client_event
                SET event_status = '実施済', updated_at = ?
                WHERE (event_status IS NULL OR event_status = '')
                  """
                + "AND " + dialect.textDateLessThanParam("event_date"),
                timestamp,
                today
        );
    }

    public List<PostponedEventReviewRow> findPostponedEventsWithPastDate(String today) {
        return jdbc.query(
                """
                SELECT id, client_name, event_name, event_date, notes
                FROM client_event
                WHERE event_status = '延期' """
                + "AND " + dialect.textDateLessThanParam("event_date")
                + " ORDER BY event_date, id",
                (rs, rowNum) -> new PostponedEventReviewRow(
                        rs.getLong("id"),
                        rs.getString("client_name"),
                        rs.getString("event_name"),
                        rs.getString("event_date"),
                        rs.getString("notes")
                ),
                today
        );
    }

    public List<ReminderTargetEventRow> findReminderTargetEvents(String eventDate) {
        return jdbc.query(
                """
                SELECT id, client_name, event_name, event_date, event_time, location,
                       event_type, event_status, notes
                FROM client_event
                """
                + "WHERE " + dialect.textDateEqualParam("event_date")
                + """
                  AND event_status IN ('予定', '延期')
                ORDER BY id
                """,
                (rs, rowNum) -> new ReminderTargetEventRow(
                        rs.getLong("id"),
                        rs.getString("client_name"),
                        rs.getString("event_name"),
                        rs.getString("event_date"),
                        rs.getString("event_time"),
                        rs.getString("location"),
                        rs.getString("event_type"),
                        rs.getString("event_status"),
                        rs.getString("notes")
                ),
                eventDate
        );
    }

    public List<ParticipantEmailRow> findParticipantEmails(long eventId) {
        return jdbc.query(
                """
                SELECT e.id AS employee_id, e.name, ep.email
                FROM client_event_participant cep
                JOIN employee e ON e.id = cep.employee_id
                LEFT JOIN employee_personal ep ON ep.employee_id = e.id
                WHERE cep.event_id = ?
                ORDER BY e.employee_code
                """,
                (rs, rowNum) -> new ParticipantEmailRow(
                        rs.getLong("employee_id"),
                        rs.getString("name"),
                        rs.getString("email")
                ),
                eventId
        );
    }

    public boolean isReminderSent(long eventId, long employeeId, int reminderDays, String eventDate) {
        Integer count = jdbc.queryForObject(
                """
                SELECT COUNT(*) FROM client_event_reminder_log
                WHERE event_id = ? AND employee_id = ? AND reminder_days = ? AND event_date = ?
                """,
                Integer.class,
                eventId,
                employeeId,
                reminderDays,
                eventDate
        );
        return count != null && count > 0;
    }

    public void markReminderSent(
            long eventId,
            long employeeId,
            int reminderDays,
            String eventDate,
            String sentAt
    ) {
        jdbc.update(
                dialect.insertReminderLogSql(),
                eventId,
                employeeId,
                reminderDays,
                eventDate,
                sentAt
        );
    }

    public void clearReminderLogs(long eventId) {
        jdbc.update("DELETE FROM client_event_reminder_log WHERE event_id = ?", eventId);
    }

    public List<ParticipantConflictRow> findParticipantConflictsOnDate(
            String eventDate,
            List<Long> employeeIds,
            Long excludeEventId
    ) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            return List.of();
        }
        var sql = new StringBuilder("""
                SELECT ce.id, ce.client_name, ce.event_name, ce.event_date, ce.event_time, ce.event_status,
                       cep.employee_id, e.name AS employee_name
                FROM client_event ce
                JOIN client_event_participant cep ON cep.event_id = ce.id
                JOIN employee e ON e.id = cep.employee_id
                """);
        sql.append(" WHERE ").append(dialect.textDateEqualParam("ce.event_date"));
        sql.append("""
                  AND ce.event_status NOT IN ('中止', '実施済')
                  AND cep.employee_id IN (
                """);
        sql.append("?,".repeat(employeeIds.size()));
        sql.setLength(sql.length() - 1);
        sql.append(")");
        if (excludeEventId != null && excludeEventId > 0) {
            sql.append(" AND ce.id <> ?");
        }
        sql.append(" ORDER BY e.name, ce.event_time, ce.id");

        var params = new ArrayList<Object>();
        params.add(eventDate);
        params.addAll(employeeIds);
        if (excludeEventId != null && excludeEventId > 0) {
            params.add(excludeEventId);
        }

        return jdbc.query(
                sql.toString(),
                (rs, rowNum) -> new ParticipantConflictRow(
                        rs.getLong("id"),
                        rs.getString("client_name"),
                        rs.getString("event_name"),
                        rs.getString("event_date"),
                        rs.getString("event_time"),
                        rs.getString("event_status"),
                        rs.getLong("employee_id"),
                        rs.getString("employee_name")
                ),
                params.toArray()
        );
    }

    public void replaceParticipants(long eventId, List<ParticipantRow> participants) {
        jdbc.update("DELETE FROM client_event_participant WHERE event_id = ?", eventId);
        for (ParticipantRow participant : participants) {
            jdbc.update(
                    """
                    INSERT INTO client_event_participant (event_id, employee_id, note)
                    VALUES (?, ?, ?)
                    """,
                    eventId,
                    participant.employeeId(),
                    participant.note()
            );
        }
    }

    public boolean isAccessible(long eventId, List<Long> scopeDepartmentIds) {
        if (scopeDepartmentIds == null) {
            return true;
        }
        if (scopeDepartmentIds.isEmpty()) {
            return false;
        }
        var sql = new StringBuilder("""
                SELECT COUNT(DISTINCT ce.id) FROM client_event ce
                WHERE ce.id = ?
                  AND (
                      NOT EXISTS (
                          SELECT 1 FROM client_event_participant cep WHERE cep.event_id = ce.id
                      )
                      OR EXISTS (
                          SELECT 1 FROM client_event_participant cep
                          JOIN employee e ON e.id = cep.employee_id
                          WHERE cep.event_id = ce.id
                """);
        var params = new ArrayList<Object>();
        params.add(eventId);
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, "e");
        sql.append("))");
        Long count = jdbc.queryForObject(sql.toString(), Long.class, params.toArray());
        return count != null && count > 0;
    }

    public List<EligibleParticipantDto> findEligibleParticipants(List<Long> scopeDepartmentIds) {
        var sql = new StringBuilder("""
                SELECT e.id, e.employee_code, e.name, d.name AS department_name, e.position
                FROM employee e
                LEFT JOIN department d ON d.id = e.department_id
                WHERE e.work_status != '退職'
                """);
        MasterData.appendEligibleAttendeePositionCondition(sql);
        sql.append("""
                """);
        var params = new ArrayList<Object>();
        appendEmployeeScopeClause(sql, params, scopeDepartmentIds, "e");
        sql.append(" ORDER BY e.employee_code");
        return jdbc.query(
                sql.toString(),
                (rs, rowNum) -> new EligibleParticipantDto(
                        rs.getLong("id"),
                        rs.getString("employee_code"),
                        rs.getString("name"),
                        rs.getString("department_name"),
                        rs.getString("position")
                ),
                params.toArray()
        );
    }

    public boolean employeesExist(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            return true;
        }
        var sql = new StringBuilder("SELECT COUNT(*) FROM employee WHERE id IN (");
        sql.append("?,".repeat(employeeIds.size()));
        sql.setLength(sql.length() - 1);
        sql.append(")");
        Long count = jdbc.queryForObject(sql.toString(), Long.class, employeeIds.toArray());
        return count != null && count == employeeIds.size();
    }

    private List<ClientEventDto> attachParticipants(List<EventHeaderRow> headers) {
        if (headers.isEmpty()) {
            return List.of();
        }
        List<Long> eventIds = headers.stream().map(EventHeaderRow::id).toList();
        Map<Long, List<ClientEventParticipantDto>> participantMap = loadParticipants(eventIds);
        List<ClientEventDto> result = new ArrayList<>();
        for (EventHeaderRow header : headers) {
            result.add(new ClientEventDto(
                    header.id(),
                    header.clientId(),
                    header.clientName(),
                    header.eventName(),
                    header.eventDate(),
                    header.eventTime(),
                    header.location(),
                    header.eventType(),
                    header.eventStatus() != null ? header.eventStatus() : "予定",
                    header.notes(),
                    header.createdByName(),
                    header.createdAt(),
                    header.updatedAt(),
                    participantMap.getOrDefault(header.id(), List.of())
            ));
        }
        return result;
    }

    private Map<Long, List<ClientEventParticipantDto>> loadParticipants(List<Long> eventIds) {
        var placeholders = String.join(",", eventIds.stream().map(id -> "?").toList());
        var sql = """
                SELECT cep.event_id, e.id AS employee_id, e.employee_code, e.name,
                       d.name AS department_name, e.position, cep.note
                FROM client_event_participant cep
                JOIN employee e ON e.id = cep.employee_id
                LEFT JOIN department d ON d.id = e.department_id
                WHERE cep.event_id IN (%s)
                ORDER BY e.employee_code
                """.formatted(placeholders);
        return jdbc.query(
                sql,
                rs -> {
                    Map<Long, List<ClientEventParticipantDto>> map = new LinkedHashMap<>();
                    while (rs.next()) {
                        long eventId = rs.getLong("event_id");
                        map.computeIfAbsent(eventId, key -> new ArrayList<>()).add(
                                new ClientEventParticipantDto(
                                        rs.getLong("employee_id"),
                                        rs.getString("employee_code"),
                                        rs.getString("name"),
                                        rs.getString("department_name"),
                                        rs.getString("position"),
                                        rs.getString("note")
                                )
                        );
                    }
                    return map;
                },
                eventIds.toArray()
        );
    }

    private void appendEventScopeClause(StringBuilder sql, List<Object> params, List<Long> scopeDepartmentIds) {
        if (scopeDepartmentIds == null) {
            return;
        }
        if (scopeDepartmentIds.isEmpty()) {
            sql.append(" AND 1=0");
            return;
        }
        sql.append("""
                 AND (
                     NOT EXISTS (
                         SELECT 1 FROM client_event_participant cep WHERE cep.event_id = ce.id
                     )
                     OR EXISTS (
                         SELECT 1 FROM client_event_participant cep
                         JOIN employee e ON e.id = cep.employee_id
                         WHERE cep.event_id = ce.id
                """);
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, "e");
        sql.append("))");
    }

    private void appendEmployeeScopeClause(
            StringBuilder sql,
            List<Object> params,
            List<Long> scopeDepartmentIds,
            String tableAlias
    ) {
        dialect.appendEmployeeDepartmentScope(sql, params, scopeDepartmentIds, tableAlias);
    }

    public record ParticipantRow(long employeeId, String note) {
    }

    public record PostponedEventReviewRow(
            long id,
            String clientName,
            String eventName,
            String eventDate,
            String notes
    ) {
    }

    public record ReminderTargetEventRow(
            long id,
            String clientName,
            String eventName,
            String eventDate,
            String eventTime,
            String location,
            String eventType,
            String eventStatus,
            String notes
    ) {
    }

    public record ParticipantEmailRow(
            long employeeId,
            String name,
            String email
    ) {
    }

    public record ParticipantConflictRow(
            long eventId,
            String clientName,
            String eventName,
            String eventDate,
            String eventTime,
            String eventStatus,
            long employeeId,
            String employeeName
    ) {
    }

    private static Long readNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record EventHeaderRow(
            long id,
            Long clientId,
            String clientName,
            String eventName,
            String eventDate,
            String eventTime,
            String location,
            String eventType,
            String eventStatus,
            String notes,
            String createdByName,
            String createdAt,
            String updatedAt
    ) {
    }
}
