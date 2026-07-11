package jp.dispatch.employee.repository;

import jp.dispatch.employee.config.JdbcGeneratedKeySupport;
import jp.dispatch.employee.dto.EmployeePayrollSlipDto;
import jp.dispatch.employee.dto.FileAttachmentDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class FileAttachmentRepository {

    private final JdbcTemplate jdbc;

    public FileAttachmentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long insert(
            String originalName,
            String contentType,
            long sizeBytes,
            String storagePath,
            String description,
            String category,
            String targetMonth,
            Long employeeId,
            Long uploadedBy,
            String uploadedByName,
            String createdAt
    ) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var ps = connection.prepareStatement(
                    """
                    INSERT INTO file_attachment (
                        original_name, content_type, size_bytes, storage_path, description,
                        category, target_month, employee_id, uploaded_by, uploaded_by_name, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    JdbcGeneratedKeySupport.ID_COLUMNS
            );
            ps.setString(1, originalName);
            ps.setString(2, contentType);
            ps.setLong(3, sizeBytes);
            ps.setString(4, storagePath);
            ps.setString(5, description);
            ps.setString(6, category);
            ps.setString(7, targetMonth);
            if (employeeId != null) {
                ps.setLong(8, employeeId);
            } else {
                ps.setNull(8, java.sql.Types.BIGINT);
            }
            if (uploadedBy != null) {
                ps.setLong(9, uploadedBy);
            } else {
                ps.setNull(9, java.sql.Types.BIGINT);
            }
            ps.setString(10, uploadedByName);
            ps.setString(11, createdAt);
            return ps;
        }, keyHolder);
        return JdbcGeneratedKeySupport.requireId(keyHolder, "ファイルの登録に失敗しました");
    }

    public List<EmployeePayrollSlipDto> findPayrollSlipsByEmployeeId(long employeeId) {
        return jdbc.query(
                """
                SELECT id, original_name, target_month, created_at, uploaded_by_name
                FROM file_attachment
                WHERE deleted_at IS NULL
                  AND category = 'PAYROLL'
                  AND employee_id = ?
                ORDER BY target_month DESC NULLS LAST, id DESC
                """,
                (rs, rowNum) -> new EmployeePayrollSlipDto(
                        rs.getLong("id"),
                        rs.getString("original_name"),
                        rs.getString("target_month"),
                        rs.getString("created_at"),
                        rs.getString("uploaded_by_name")
                ),
                employeeId
        );
    }

    public List<FileAttachmentDto> search(String keyword, String category, String targetMonth) {
        var sql = new StringBuilder(
                """
                SELECT id, original_name, content_type, size_bytes, description, category, target_month,
                       uploaded_by, uploaded_by_name, created_at
                FROM file_attachment
                WHERE deleted_at IS NULL
                """
        );
        var params = new ArrayList<Object>();
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (original_name ILIKE ? OR COALESCE(description, '') ILIKE ?)");
            String pattern = "%" + keyword.trim() + "%";
            params.add(pattern);
            params.add(pattern);
        }
        if (category != null && !category.isBlank()) {
            sql.append(" AND category = ?");
            params.add(category.trim());
        }
        if (targetMonth != null && !targetMonth.isBlank()) {
            sql.append(" AND target_month = ?");
            params.add(targetMonth.trim());
        }
        sql.append(" ORDER BY target_month DESC NULLS LAST, id DESC");
        return jdbc.query(
                sql.toString(),
                (rs, rowNum) -> mapRow(rs),
                params.toArray()
        );
    }

    public Optional<FileAttachmentRecord> findActiveById(long id) {
        var rows = jdbc.query(
                """
                SELECT id, original_name, content_type, size_bytes, storage_path, description,
                       category, target_month, uploaded_by, uploaded_by_name, created_at
                FROM file_attachment
                WHERE id = ? AND deleted_at IS NULL
                """,
                (rs, rowNum) -> new FileAttachmentRecord(
                        rs.getLong("id"),
                        rs.getString("original_name"),
                        rs.getString("content_type"),
                        rs.getLong("size_bytes"),
                        rs.getString("storage_path"),
                        rs.getString("description"),
                        rs.getString("category"),
                        rs.getString("target_month"),
                        rs.getObject("uploaded_by") != null ? rs.getLong("uploaded_by") : null,
                        rs.getString("uploaded_by_name"),
                        rs.getString("created_at")
                ),
                id
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.getFirst());
    }

    public boolean markDeleted(long id, String deletedAt) {
        int updated = jdbc.update(
                """
                UPDATE file_attachment
                SET deleted_at = ?
                WHERE id = ? AND deleted_at IS NULL
                """,
                deletedAt,
                id
        );
        return updated > 0;
    }

    public List<FileAttachmentDto> findPayrollByTargetMonth(String targetMonth) {
        return search(null, "PAYROLL", targetMonth);
    }

    public List<FileAttachmentDto> findAllPayroll() {
        return search(null, "PAYROLL", null);
    }

    private static FileAttachmentDto mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new FileAttachmentDto(
                rs.getLong("id"),
                rs.getString("original_name"),
                rs.getString("content_type"),
                rs.getLong("size_bytes"),
                rs.getString("description"),
                rs.getString("category"),
                rs.getString("target_month"),
                rs.getObject("uploaded_by") != null ? rs.getLong("uploaded_by") : null,
                rs.getString("uploaded_by_name"),
                rs.getString("created_at")
        );
    }

    public record FileAttachmentRecord(
            long id,
            String originalName,
            String contentType,
            long sizeBytes,
            String storagePath,
            String description,
            String category,
            String targetMonth,
            Long uploadedBy,
            String uploadedByName,
            String createdAt
    ) {
        public FileAttachmentDto toDto() {
            return new FileAttachmentDto(
                    id,
                    originalName,
                    contentType,
                    sizeBytes,
                    description,
                    category,
                    targetMonth,
                    uploadedBy,
                    uploadedByName,
                    createdAt
            );
        }
    }
}
