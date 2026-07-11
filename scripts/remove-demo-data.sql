-- 公司生产环境：删除 Flyway 自带的演示社员（E001～E015、E2008 等）
-- 不影响 department 主数据与 auth_user 登录账号
-- 执行示例（项目根目录）:
--   Get-Content .\scripts\remove-demo-data.sql | docker compose exec -T postgres psql -U employee_app -d employee_mgmt

DELETE FROM employee
WHERE employee_code IN (
    'E001', 'E002', 'E003', 'E004', 'E005',
    'E006', 'E007', 'E008', 'E009', 'E010',
    'E011', 'E012', 'E013', 'E014', 'E015',
    'E2008'
);

-- 子表因 ON DELETE CASCADE 会自动清理
