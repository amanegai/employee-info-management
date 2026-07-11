package jp.dispatch.employee.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class TotpRecoveryCodeRepository {

    private final JdbcTemplate jdbc;

    public TotpRecoveryCodeRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void deleteByUserId(long userId) {
        jdbc.update("DELETE FROM auth_user_recovery_code WHERE user_id = ?", userId);
    }

    public void insert(long userId, String codeHash, String createdAt) {
        jdbc.update(
                """
                INSERT INTO auth_user_recovery_code (user_id, code_hash, created_at)
                VALUES (?, ?, ?)
                """,
                userId,
                codeHash,
                createdAt
        );
    }

    public List<RecoveryCodeRow> findUnusedByUserId(long userId) {
        return jdbc.query(
                """
                SELECT id, code_hash
                FROM auth_user_recovery_code
                WHERE user_id = ? AND used_at IS NULL
                ORDER BY id
                """,
                (rs, rowNum) -> new RecoveryCodeRow(rs.getLong("id"), rs.getString("code_hash")),
                userId
        );
    }

    public void markUsed(long id, String usedAt) {
        jdbc.update("UPDATE auth_user_recovery_code SET used_at = ? WHERE id = ?", usedAt, id);
    }

    public int countUnused(long userId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM auth_user_recovery_code WHERE user_id = ? AND used_at IS NULL",
                Integer.class,
                userId
        );
        return count != null ? count : 0;
    }

    public record RecoveryCodeRow(long id, String codeHash) {
    }
}
