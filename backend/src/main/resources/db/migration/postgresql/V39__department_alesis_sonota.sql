-- 所属部門：アレシス（als 前缀）・その他（btc 前缀、個人事業主/BP 用）
INSERT INTO department (name, parent_id)
SELECT 'アレシス', NULL
WHERE NOT EXISTS (SELECT 1 FROM department WHERE name = 'アレシス');

INSERT INTO department (name, parent_id)
SELECT 'その他', NULL
WHERE NOT EXISTS (SELECT 1 FROM department WHERE name = 'その他');
