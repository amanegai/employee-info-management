-- 社員情報管理システム用 PostgreSQL 初期設定
-- 実行例:
--   psql -U postgres -h localhost -f scripts/setup-postgres.sql

CREATE DATABASE employee_mgmt
    ENCODING 'UTF8'
    LC_COLLATE 'Japanese_Japan.932'
    LC_CTYPE 'Japanese_Japan.932'
    TEMPLATE template0;

CREATE USER employee_app WITH PASSWORD 'employee_app_dev';

GRANT ALL PRIVILEGES ON DATABASE employee_mgmt TO employee_app;

\c employee_mgmt

GRANT ALL ON SCHEMA public TO employee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO employee_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO employee_app;
