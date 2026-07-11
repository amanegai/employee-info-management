#!/usr/bin/env bash
# 公司服务器初期化（空库 + 必须主数据，不迁移本机 PostgreSQL）
# 用法（项目根目录）: ./scripts/init-company-docker.sh
# 可选:
#   --skip-demo-removal     保留 Flyway 演示社员（仅测试环境）
#   --replace-departments   按 seed-company-master.sql 替换部门

set -euo pipefail

SKIP_DEMO_REMOVAL=0
REPLACE_DEPARTMENTS=0

for arg in "$@"; do
  case "$arg" in
    --skip-demo-removal) SKIP_DEMO_REMOVAL=1 ;;
    --replace-departments) REPLACE_DEPARTMENTS=1 ;;
    -h|--help)
      echo "用法: $0 [--skip-demo-removal] [--replace-departments]"
      exit 0
      ;;
    *)
      echo "未知参数: $arg" >&2
      exit 1
      ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "请先执行: cp deploy.env.example .env 并设置 DB_PASSWORD" >&2
  exit 1
fi

echo "== 1/3 启动 Docker Compose（Flyway 自动建表）=="
docker compose up -d --build

echo "等待 postgres 与应用就绪..."
sleep 15

if [[ "$SKIP_DEMO_REMOVAL" -eq 0 ]]; then
  echo "== 2/3 删除演示社员数据 =="
  docker compose exec -T postgres psql -U employee_app -d employee_mgmt \
    -v ON_ERROR_STOP=1 < "$ROOT/scripts/remove-demo-data.sql"
else
  echo "== 2/3 跳过删除演示社员 (--skip-demo-removal) =="
fi

if [[ "$REPLACE_DEPARTMENTS" -eq 1 ]]; then
  echo "== 3/3 按 seed-company-master.sql 替换部门 =="
  docker compose exec -T postgres psql -U employee_app -d employee_mgmt \
    -v ON_ERROR_STOP=1 < "$ROOT/scripts/seed-company-master.sql"
else
  echo "== 3/3 保留 Flyway 默认部门（无需替换）=="
fi

echo ""
echo "完成。请浏览器打开 http://<服务器>:8080"
echo "首次登录: admin / admin123（上线后立即改密）"
echo "然后在「用户管理」创建公司真实账号，在画面登记真实社员。"
