# AWS 部署过程记录（实操备忘）

| 项目 | 内容 |
|------|------|
| 作成日 | 2026-07-13 |
| 文档位置 | `employee-info-management/docs/aws-deployment-log.md` |
| 状态 | EC2 + Docker Compose 已上线，登录页可访问 |
| 相关文档 | [aws-what-you-should-do.md](aws-what-you-should-do.md)、[deploy-linux.md](deploy-linux.md)、[aws-deployment-checklist.md](aws-deployment-checklist.md)、**[aws-redeploy.md](aws-redeploy.md)（再发布・启停命令速查）** |

本文记录 **从决定上 AWS 到首次打开登录页** 的实际过程、踩坑与日常运维约定，便于本人与同事回顾。

---

## 1. 已确定的方针

| 项 | 决定 |
|----|------|
| 云平台 | AWS |
| 架构 | **方案1**：EC2 + Docker Compose（应用 + PostgreSQL 均在容器内） |
| 宿主机 OS | Ubuntu LTS（推荐 **24.04**；实例以控制台 AMI 为准） |
| 区域 | **ap-northeast-1**（东京） |
| 实例 | **t3.medium**，磁盘约 100GB 量级 |
| 数据 | **不迁本机 PostgreSQL**；空库 + 部门 master；删除演示社员 |
| 宿主机 | **不单独安装** PostgreSQL / JDK / Node（由 Docker 提供） |
| Git 策略 | **同一仓库**的 `main`（生产）与 `Develop`（开发）；**不再**单独建「只给服务器」的第三仓库 |
| 服务器只跟 | **`main`** 分支 |

---

## 2. 当前生产实例信息（请随环境更新）

| 项 | 值（首次上线时） |
|----|------------------|
| 实例名 | BTC-AI Emplo...（以控制台为准） |
| Instance ID | `i-00194ca91ac357119`（以控制台为准） |
| 可用区 | ap-northeast-1c |
| 公网 / Elastic IP | `13.159.132.121` |
| 访问 URL | `http://13.159.132.121:8080` |
| SSH 用户 | `ubuntu` |
| 项目目录 | `/opt/employee-mgmt/employee-info-management` |
| GitHub 仓库 | `https://github.com/zhoukai2xxx/employee-info-management.git` |
| Compose 项目名 | `employee-mgmt` |
| 容器 | `employee-mgmt-app`（8080）、`employee-mgmt-db`（Postgres） |

> IP / 实例 ID 若变更，请改本表，避免同事用错地址。

---

## 3. 实际走过的步骤（时间线）

### 3.1 准备阶段

1. 本地 Docker Desktop 调通（含 WSL 安装/更新）
2. 仓库具备 `Dockerfile`、`docker-compose.yml`、部署文档
3. 决定空库上线，不迁本机数据
4. 选定 AWS + EC2 + Compose，OS 用 Ubuntu LTS

### 3.2 开通 EC2

1. 东京区域创建实例（t3.medium）
2. 分配 **Elastic IP**（公网 IP 固定）
3. 用 EC2 Instance Connect / SSH 以 `ubuntu` 登录
4. （可选）`sudo apt update && sudo apt upgrade -y`

### 3.3 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker
docker --version
docker compose version
```

### 3.4 获取源码（GitHub）

```bash
sudo mkdir -p /opt/employee-mgmt
sudo chown "$USER:$USER" /opt/employee-mgmt
cd /opt/employee-mgmt
git clone https://github.com/zhoukai2xxx/employee-info-management.git
cd employee-info-management
```

说明：

- clone **未加末尾 `.`** 时，代码在子目录 `employee-info-management/` 下（当前即此布局）
- GitHub **不再接受账号密码**；HTTPS 需用 **Personal Access Token（PAT）** 作为 Password，或改用 SSH 密钥

### 3.5 配置与启动

```bash
cd /opt/employee-mgmt/employee-info-management
# 若无 deploy.env.example，可手动创建 .env：
#   echo 'DB_PASSWORD=强密码' > .env
cp deploy.env.example .env   # 有该文件时
nano .env                    # 设置 DB_PASSWORD；Ctrl+O 回车保存，Ctrl+X 退出

docker compose up -d --build
```

首次构建可能需 10～30 分钟。

自检：

```bash
docker compose ps
curl -I http://127.0.0.1:8080
# 期望：HTTP/1.1 200
```

### 3.6 安全组（外网打不开的根因）

现象：服务器本机 `curl 127.0.0.1:8080` 成功，浏览器访问公网 IP:8080 失败。

原因：安全组 `launch-wizard-2` 最初 **只有 22（SSH）**，没有 **8080**。

处理：

1. EC2 → 实例 → セキュリティ → 打开安全组  
2. **インバウンドのルールを編集** → 追加：

| タイプ | ポート | ソース |
|--------|--------|--------|
| カスタム TCP | **8080** | 测试可用 `0.0.0.0/0`；之后改为公司 IP / マイ IP |

3. 保存后再访问 `http://<Elastic-IP>:8080`

**不要**对公网开放 **5432**。

### 3.7 初期数据

```bash
cd /opt/employee-mgmt/employee-info-management
docker compose exec -T postgres psql -U employee_app -d employee_mgmt < scripts/remove-demo-data.sql
```

- 删除演示社员（E001～ 等）  
- **保留**部门 master、登录用账号（admin 等由应用首次启动创建）  
- **登录页上的「初期アカウント」提示**是前端写死的，**删库数据不会去掉**；已在源码 `LoginPage.jsx` 中移除该 UI，需 **合并到 main 并在服务器 `git pull` + rebuild** 后才生效

### 3.8 登录验收

- 浏览器打开登录页成功  
- 使用初始账号登录后 **立即修改密码**（admin / hr / sales / user 等）  
- 再按需创建真实用户  

---

## 4. 踩过的坑（速查）

| 现象 | 原因 | 处理 |
|------|------|------|
| `git clone` 认证失败 | GitHub 禁用密码认证 | 用 PAT 或 SSH |
| `cp deploy.env.example .env` 找不到文件 | 文件未进远端，或不在当前目录 | `find` 定位；或手动写 `.env` |
| 在 `/opt/employee-mgmt` 找不到 compose | clone 进了子目录 | `cd .../employee-info-management` |
| 本机 curl 200，浏览器打不开 | 安全组无 8080 | 添加入站 8080 |
| 删了测试社员，登录页仍显示初期账号 | 前端写死提示 | 改 `LoginPage.jsx` 后重新部署 |
| `project name must not be empty`（本地日文路径） | Compose 无法从日文目录名生成项目名 | `docker-compose.yml` 中已设 `name: employee-mgmt` |

---

## 5. Git 分支约定（main / Develop）

| 分支 | 用途 |
|------|------|
| **Develop** | 日常开发、自测 |
| **main** | 已验证，**AWS 生产专用** |

**不要**再为服务器单独建第三个仓库；用分支区分即可。

### 开发 → 上线流程

```text
本机在 Develop 改代码并测试
    → 合并到 main 并 push
    → EC2 上拉取 main 并重建容器
```

### 服务器更新命令

> 命令速查已单独整理：[aws-redeploy.md](aws-redeploy.md)

```bash
cd /opt/employee-mgmt/employee-info-management
git fetch
git checkout main
git pull origin main
docker compose up -d --build
```

确认当前分支：

```bash
git branch --show-current
git status -sb
git log -1 --oneline
```

> 注意：仅 `git pull` 而不 `docker compose up -d --build`，**运行中的容器不会自动变成新代码**。

---

## 6. 日常运维备忘

### 查看状态与日志

```bash
cd /opt/employee-mgmt/employee-info-management
docker compose ps
docker compose logs -f app
docker compose logs --tail=50 postgres
```

### 备份数据库

```bash
mkdir -p /opt/backup
docker compose exec -T postgres pg_dump -U employee_app employee_mgmt \
  > /opt/backup/employee_mgmt_$(date +%Y%m%d).sql
```

### 禁止

```bash
# 不要随意执行（-v 会删除数据卷 = 清空库和上传文件）
docker compose down -v
```

### 停止 / 启动（保留数据）

```bash
docker compose stop
docker compose start
# 或
docker compose down      # 删容器，保留卷
docker compose up -d
```

---

## 7. 安全清单（上线后持续）

- [ ] 所有默认账号已改密或禁用  
- [ ] 演示社员已删除  
- [ ] 登录页不再展示默认密码（源码已改则确认已部署到 main）  
- [ ] 安全组 8080 / 22 尽量限制为公司 IP，避免长期 `0.0.0.0/0`  
- [ ] 5432 **不对公网开放**  
- [ ] `.env`、PAT、SSH 私钥不进 Git  
- [ ] 定期 `pg_dump` 备份  

---

## 8. 服务器上需要放什么 / 不需要放什么

| 需要 | 不需要 |
|------|--------|
| Git 仓库完整源码（Dockerfile、frontend、backend、scripts…） | `node_modules`、`backend/target` |
| 服务器本地 `.env`（`DB_PASSWORD`） | 本机整库 dump（空库方针） |
| | 宿主机再装一份 PostgreSQL |

---

## 9. 后续可选增强（未做）

| 项 | 说明 |
|----|------|
| HTTPS + 域名 | ALB/ACM 或 Nginx + 证书 |
| RDS | 数据库从 EC2 容器拆出 |
| S3 | 附件对象存储（需改代码） |
| 自动备份到 S3 | cron + `pg_dump` |
| SSH 源改为「マイ IP」 | 降低爆破风险 |

---

## 10. 一句话回顾

**东京 EC2（Ubuntu）→ 装 Docker → clone 仓库到 `/opt/employee-mgmt/employee-info-management` → `.env` + `compose up --build` → 安全组放行 8080 → 删演示社员 → 改默认密码；日常用 Develop 开发、main 发布到服务器。**

---

*本文随实操更新。实例 IP、安全组名称变化时请同步修改第 2 节。*
