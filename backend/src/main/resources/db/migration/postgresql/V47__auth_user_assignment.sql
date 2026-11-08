-- ユーザーの本職・兼職（会社×ロール×部門）。社員マスタには持たない。
CREATE TABLE IF NOT EXISTS auth_user_assignment (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    affiliation_company  TEXT,
    role                 TEXT NOT NULL,
    department_id        BIGINT REFERENCES department(id) ON DELETE SET NULL,
    is_primary           BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order           INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_auth_user_assignment_user
    ON auth_user_assignment (user_id, sort_order, id);

-- 既存ユーザーを1行の本職として移行（ロールごと）
INSERT INTO auth_user_assignment (user_id, affiliation_company, role, department_id, is_primary, sort_order)
SELECT u.id,
       NULLIF(TRIM(u.affiliation_company), ''),
       r.role,
       u.department_id,
       TRUE,
       0
FROM auth_user u
INNER JOIN auth_user_role r ON r.user_id = u.id
WHERE NOT EXISTS (
    SELECT 1 FROM auth_user_assignment a WHERE a.user_id = u.id
);
