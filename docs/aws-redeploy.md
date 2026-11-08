# AWS 程序部署・启停命令速查

| 项目 | 内容 |
|------|------|
| 作成日 | 2026-08-06 |
| 用途 | 在已上线的 EC2 上**再次发布**、启停、备份的常用命令 |
| 架构 | EC2（Ubuntu）+ Docker Compose（应用 + PostgreSQL） |
| 详细过程 | [aws-deployment-log.md](aws-deployment-log.md) |
| 首次安装 | [deploy-linux.md](deploy-linux.md)、[aws-what-you-should-do.md](aws-what-you-should-do.md) |

---

## 1. 环境速查（随实例变更请改本表）

| 项 | 值 |
|----|-----|
| SSH | `ubuntu@<Elastic-IP>`（例：`ubuntu@13.159.132.121`） |
| 访问 URL | `http://<Elastic-IP>:8080` |
| 项目目录 | `/opt/employee-mgmt/employee-info-management` |
| 生产分支 | **`main`** |
| Compose 项目名 | `employee-mgmt` |
| 应用容器 | `employee-mgmt-app`（端口 8080） |
| DB 容器 | `employee-mgmt-db`（PostgreSQL，**不对公网开 5432**） |

登录服务器：

```bash
ssh -i <你的密钥.pem> ubuntu@<Elastic-IP>
# 或使用 EC2 Instance Connect
```

之后所有命令默认在项目目录下执行：

```bash
cd /opt/employee-mgmt/employee-info-management
```

---

## 2. 再次发布（更新程序）— 最常用

### 2.1 本机准备

```text
Develop 开发并自测
  → 合并到 main
  → git push origin main
```

### 2.2 服务器上更新并重建

```bash
cd /opt/employee-mgmt/employee-info-management

git fetch
git checkout main
git pull origin main

# 用新代码重建镜像并启动（保留数据卷，不清库）
docker compose up -d --build
```

### 2.3 发布后确认

```bash
docker compose ps
docker compose logs --tail=100 app
# 期望日志中出现：Started ...Application

curl -I http://127.0.0.1:8080
# 期望：HTTP/1.1 200
```

浏览器打开 `http://<Elastic-IP>:8080`，必要时 **Ctrl+F5** 强制刷新。

> **注意：** 只 `git pull` 而不执行 `docker compose up -d --build`，运行中的容器仍是旧代码。

### 2.4 确认当前代码版本

```bash
git branch --show-current
git status -sb
git log -1 --oneline
```

---

## 3. 启停（不发布新版本）

```bash
cd /opt/employee-mgmt/employee-info-management

# 停止（保留数据）
docker compose stop

# 再启动
docker compose start

# 删容器后重建（仍保留数据卷）
docker compose down
docker compose up -d
```

容器配置了 `restart: unless-stopped`，EC2 重启后一般会自动拉起。若未起来：

```bash
cd /opt/employee-mgmt/employee-info-management
docker compose up -d
```

---

## 4. 日志与状态

```bash
cd /opt/employee-mgmt/employee-info-management

docker compose ps
docker compose logs -f app              # 应用实时日志（Ctrl+C 退出）
docker compose logs --tail=50 postgres  # 数据库最近日志
```

---

## 5. 发布前备份（建议）

```bash
cd /opt/employee-mgmt/employee-info-management
mkdir -p /opt/backup

docker compose exec -T postgres pg_dump -U employee_app employee_mgmt \
  > /opt/backup/employee_mgmt_$(date +%Y%m%d_%H%M).sql
```

---

## 6. 禁止操作

```bash
# 千万不要加 -v：会删除数据卷 = 清空数据库和上传文件
docker compose down -v
```

`.env`、SSH 私钥、GitHub PAT **不要**提交到 Git。

---

## 7. 安全组（外网访问）

| 端口 | 说明 |
|------|------|
| 22 | SSH（尽量限制为运维 IP） |
| **8080** | 业务访问（尽量限制为公司 IP / VPN） |
| **5432** | **不要对公网开放** |

本机 `curl 127.0.0.1:8080` 成功但浏览器打不开时，优先检查安全组是否放行 8080。

---

## 8. 首次部署（仅新机器；已上线可跳过）

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker

# 代码
sudo mkdir -p /opt/employee-mgmt
sudo chown "$USER:$USER" /opt/employee-mgmt
cd /opt/employee-mgmt
git clone https://github.com/zhoukai2xxx/employee-info-management.git
cd employee-info-management
git checkout main

# 配置
cp deploy.env.example .env
nano .env   # 设置 DB_PASSWORD

# 启动
docker compose up -d --build

# 删演示社员（空库方针）
docker compose exec -T postgres psql -U employee_app -d employee_mgmt \
  < scripts/remove-demo-data.sql
```

首次登录后立即修改默认账号密码。

---

## 9. 常见问题

| 现象 | 处理 |
|------|------|
| `git pull` 认证失败 | GitHub 用 PAT 或 SSH key，勿用账号密码 |
| 找不到 `docker-compose.yml` | 确认在 `.../employee-info-management` 子目录 |
| 页面仍是旧 UI | 确认已 `--build`；浏览器强刷 |
| 构建很慢 | 依赖变更时正常，可达十几分钟 |
| Flyway 迁移 | 新容器启动时自动执行；发布前确保 `main` 含对应 SQL |

---

## 10. 一键复制：日常再发布

```bash
cd /opt/employee-mgmt/employee-info-management \
  && git fetch && git checkout main && git pull origin main \
  && docker compose up -d --build \
  && docker compose ps \
  && curl -I http://127.0.0.1:8080
```

---

*IP / 实例变更时请同步更新第 1 节。更完整的踩坑与时间线见 [aws-deployment-log.md](aws-deployment-log.md)。*
