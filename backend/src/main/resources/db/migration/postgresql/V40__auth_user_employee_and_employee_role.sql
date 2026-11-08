-- ログインユーザーと社員マスタの紐付け（MyPage 用）
ALTER TABLE auth_user
    ADD COLUMN IF NOT EXISTS employee_id BIGINT REFERENCES employee(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_user_employee_id
    ON auth_user(employee_id)
    WHERE employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_user_employee_id
    ON auth_user(employee_id)
    WHERE employee_id IS NOT NULL;
