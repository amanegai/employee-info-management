package jp.dispatch.employee.config;

import org.springframework.jdbc.support.GeneratedKeyHolder;

/**
 * PostgreSQL は RETURN_GENERATED_KEYS で全列が返るため、
 * insert 時は {@code new String[]{"id"}} を使い、取得もここで統一する。
 */
public final class JdbcGeneratedKeySupport {

    public static final String[] ID_COLUMNS = {"id"};

    private JdbcGeneratedKeySupport() {
    }

    public static long requireId(GeneratedKeyHolder keyHolder, String errorMessage) {
        Number key = keyHolder.getKey();
        if (key == null && keyHolder.getKeys() != null && keyHolder.getKeys().get("id") instanceof Number id) {
            key = id;
        }
        if (key == null) {
            throw new IllegalStateException(errorMessage);
        }
        return key.longValue();
    }
}
