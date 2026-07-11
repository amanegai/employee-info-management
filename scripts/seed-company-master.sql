-- 公司初期：仅部門マスタ（可按贵司组织修改后执行）
-- 若首次 docker compose up 后默认部门（V2）已满足需求，可跳过本文件
--
-- 完全替换部门树时（须先无社员数据，建议先执行 remove-demo-data.sql）:
--   Get-Content .\scripts\seed-company-master.sql | docker compose exec -T postgres psql -U employee_app -d employee_mgmt

BEGIN;

DELETE FROM department;

INSERT INTO department (id, name, parent_id) VALUES
(1, '事業一部', NULL),
(2, '事業一部・開発一部', 1),
(3, '事業一部・開発二部', 1),
(4, '事業一部・開発三部', 1),
(5, '事業二部', NULL),
(6, '事業二部・開発一部', 5),
(7, '事業二部・開発二部', 5),
(8, '事業二部・開発三部', 5),
(9, '営業部', NULL),
(10, '人事部', NULL);

SELECT setval(pg_get_serial_sequence('department', 'id'), (SELECT COALESCE(MAX(id), 1) FROM department));

COMMIT;
