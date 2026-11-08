-- 国籍マスタ
CREATE TABLE IF NOT EXISTS nationality (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    is_japan    BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO nationality (name, is_japan, sort_order, is_active) VALUES
    ('日本', TRUE, 1, TRUE),
    ('中国', FALSE, 10, TRUE),
    ('韓国', FALSE, 11, TRUE),
    ('台湾', FALSE, 12, TRUE),
    ('ベトナム', FALSE, 13, TRUE),
    ('フィリピン', FALSE, 14, TRUE),
    ('ネパール', FALSE, 15, TRUE),
    ('インド', FALSE, 16, TRUE),
    ('インドネシア', FALSE, 17, TRUE),
    ('タイ', FALSE, 18, TRUE),
    ('マレーシア', FALSE, 19, TRUE),
    ('シンガポール', FALSE, 20, TRUE),
    ('ミャンマー', FALSE, 21, TRUE),
    ('バングラデシュ', FALSE, 22, TRUE),
    ('スリランカ', FALSE, 23, TRUE),
    ('パキスタン', FALSE, 24, TRUE),
    ('モンゴル', FALSE, 25, TRUE),
    ('アメリカ', FALSE, 40, TRUE),
    ('カナダ', FALSE, 41, TRUE),
    ('イギリス', FALSE, 42, TRUE),
    ('フランス', FALSE, 43, TRUE),
    ('ドイツ', FALSE, 44, TRUE),
    ('イタリア', FALSE, 45, TRUE),
    ('スペイン', FALSE, 46, TRUE),
    ('オーストラリア', FALSE, 47, TRUE),
    ('ニュージーランド', FALSE, 48, TRUE),
    ('ブラジル', FALSE, 49, TRUE),
    ('その他', FALSE, 99, TRUE)
ON CONFLICT (name) DO NOTHING;

-- 在留資格マスタ
CREATE TABLE IF NOT EXISTS residence_status (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO residence_status (name, sort_order, is_active) VALUES
    ('人文知識・国際業務（1年）', 1, TRUE),
    ('人文知識・国際業務（3年）', 2, TRUE),
    ('人文知識・国際業務（5年）', 3, TRUE),
    ('高度人材', 4, TRUE),
    ('定住', 5, TRUE),
    ('永住', 6, TRUE)
ON CONFLICT (name) DO NOTHING;

-- 社員個人情報に在留・国籍ID列を追加
ALTER TABLE employee_personal
    ADD COLUMN IF NOT EXISTS nationality_id BIGINT REFERENCES nationality(id),
    ADD COLUMN IF NOT EXISTS residence_status_id BIGINT REFERENCES residence_status(id),
    ADD COLUMN IF NOT EXISTS residence_card_number TEXT,
    ADD COLUMN IF NOT EXISTS residence_card_expiry TEXT;

-- 既存の国籍テキストを可能なかぎり ID に変換
UPDATE employee_personal ep
SET nationality_id = n.id
FROM nationality n
WHERE ep.nationality_id IS NULL
  AND ep.nationality IS NOT NULL
  AND TRIM(ep.nationality) <> ''
  AND (
      LOWER(TRIM(ep.nationality)) = LOWER(n.name)
      OR (TRIM(ep.nationality) IN ('日本国', 'Japan', 'japan', 'JAPAN') AND n.name = '日本')
      OR (TRIM(ep.nationality) IN ('中国籍', '中華人民共和国', 'China', 'china') AND n.name = '中国')
      OR (TRIM(ep.nationality) IN ('韓国籍', '大韓民国', 'Korea', 'korea') AND n.name = '韓国')
  );

-- 未マッチの既存国籍は「その他」へ
UPDATE employee_personal ep
SET nationality_id = (SELECT id FROM nationality WHERE name = 'その他' LIMIT 1)
WHERE ep.nationality_id IS NULL
  AND ep.nationality IS NOT NULL
  AND TRIM(ep.nationality) <> '';

-- 旧テキスト列は廃止（表示はマスタ JOIN で取得）
ALTER TABLE employee_personal DROP COLUMN IF EXISTS nationality;
