-- ログインユーザーの所属会社（管理者は未設定＝会社横断）
ALTER TABLE auth_user
    ADD COLUMN IF NOT EXISTS affiliation_company TEXT;

COMMENT ON COLUMN auth_user.affiliation_company IS
    '所属会社。ADMIN は NULL（会社を分けない）。その他ロールはマスタ値を保持。';
