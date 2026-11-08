-- 所属会社（ビットクロス / アレシス / 衆和テクノロジー）と部門の会社スコープ

ALTER TABLE department
    ADD COLUMN IF NOT EXISTS company VARCHAR(64);

-- 既存部門はビットクロス扱い（旧「アレシス」部門を除く）
UPDATE department
SET company = 'ビットクロス'
WHERE company IS NULL
  AND name IS DISTINCT FROM 'アレシス';

UPDATE department
SET company = 'アレシス'
WHERE name = 'アレシス'
  AND company IS NULL;

-- 同名部門を会社別に持てるよう、name 単独 UNIQUE を (name, company) に変更
ALTER TABLE department DROP CONSTRAINT IF EXISTS department_name_key;
DROP INDEX IF EXISTS department_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_department_name_company
    ON department (name, company);

ALTER TABLE employee
    ADD COLUMN IF NOT EXISTS affiliation_company VARCHAR(64);

UPDATE employee
SET affiliation_company = 'ビットクロス'
WHERE affiliation_company IS NULL;

-- 旧「アレシス」部門に紐づく社員を所属会社アレシスへ
UPDATE employee e
SET affiliation_company = 'アレシス'
FROM department d
WHERE e.department_id = d.id
  AND d.name = 'アレシス';

-- アレシス・衆和用の開発部・営業部（同名・会社別）
INSERT INTO department (name, parent_id, company)
SELECT '開発部', NULL, 'アレシス'
WHERE NOT EXISTS (
    SELECT 1 FROM department WHERE name = '開発部' AND company = 'アレシス'
);

INSERT INTO department (name, parent_id, company)
SELECT '営業部', NULL, 'アレシス'
WHERE NOT EXISTS (
    SELECT 1 FROM department WHERE name = '営業部' AND company = 'アレシス'
);

INSERT INTO department (name, parent_id, company)
SELECT '開発部', NULL, '衆和テクノロジー'
WHERE NOT EXISTS (
    SELECT 1 FROM department WHERE name = '開発部' AND company = '衆和テクノロジー'
);

INSERT INTO department (name, parent_id, company)
SELECT '営業部', NULL, '衆和テクノロジー'
WHERE NOT EXISTS (
    SELECT 1 FROM department WHERE name = '営業部' AND company = '衆和テクノロジー'
);

-- 旧アレシス部門の社員をアレシス開発部へ付け替え
UPDATE employee e
SET department_id = d_new.id
FROM department d_old
JOIN department d_new ON d_new.name = '開発部' AND d_new.company = 'アレシス'
WHERE e.department_id = d_old.id
  AND d_old.name = 'アレシス';

-- 旧アレシス部門は選択不可にするため削除（参照が残っていなければ）
DELETE FROM department d
WHERE d.name = 'アレシス'
  AND NOT EXISTS (SELECT 1 FROM employee e WHERE e.department_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM auth_user u WHERE u.department_id = d.id);

CREATE INDEX IF NOT EXISTS idx_employee_affiliation_company
    ON employee (affiliation_company);

CREATE INDEX IF NOT EXISTS idx_department_company
    ON department (company);
