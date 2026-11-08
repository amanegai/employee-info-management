# AWS 部署 — 你（开发担当）接下来要做的事

| 项目 | 内容 |
|------|------|
| 作成日 | 2026-07-11 |
| 更新 | 2026-07-12：宿主机已选定 **Ubuntu 24.04 LTS** |
| 文档目录 | `C:\zk\会社\work\employee-info-management\docs` |
| 前提 | **已决定部署到 AWS**；OS = **Ubuntu 24.04 LTS** |
| 推荐架构 | **方案1：EC2（Ubuntu 24.04）+ Docker Compose**（与本地一致，最快） |
| 数据方针 | 空库 + 部门 master；不迁本机整库；删演示社员 |

相关文档：

- **再发布・启停命令速查**：[aws-redeploy.md](aws-redeploy.md)
- **过程记录（实操）**：[aws-deployment-log.md](aws-deployment-log.md)
- 同事确认用：`aws-deployment-checklist.md`
- Linux/Docker 步骤：`deploy-linux.md`
- Windows Docker 参考：`deploy-docker.md`

---

## 总览：你要负责什么

| 阶段 | 你做什么 | 可交给同事/IT 的 |
|------|----------|------------------|
| 1. 对齐信息 | 把确认表发出去，收回答案 | AWS 账号、预算、访问限制、域名 |
| 2. 准备仓库 | 保证 Git 干净、可从 AWS 拉取 | — |
| 3. 准备生产配置 | `.env` 清单、安全注意点 | — |
| 4. 开通云资源 | 若你有权限则自己开 EC2；否则给 IT 清单 | EC2、安全组、（可选）域名 |
| 5. 部署应用 | SSH 上去 `compose up`、初始化 | — |
| 6. 上线验收 | 改密、建用户、验收清单 | 人事/营业试用 |
| 7. 运维 | 备份脚本、更新流程 | 监控告警（可选） |

---

## 第 1 步：和同事对齐（本周先做）

即使「一定上 AWS」，仍要确认下面几项，否则安全组和域名会卡住：

向同事确认（可用 `aws-deployment-checklist.md` 第 8 节模板）：

1. **AWS 账号**是谁的、你是否有登录权限  
2. **区域**：建议东京 `ap-northeast-1`  
3. **谁能访问**：公司 VPN / 固定 IP 白名单（不要对全世界开放 8080）  
4. **网址**：先用 `http://IP:8080`，还是必须 `https://域名`  
5. **谁开 EC2**：你自己开，还是基础设施同事开  

你自己先定下来的默认建议（可直接告诉同事）：

- 架构：**EC2 + Docker Compose**（暂不上 RDS）  
- 数据：**空库 + 部门 master**，不迁本机库  
- DB 端口：**不对公网开放 5432**

---

## 第 2 步：整理本机仓库（你现在就能做）

在 `employee-info-management` 仓库中确认：

| 检查项 | 做法 |
|--------|------|
| 部署文件齐全 | 有 `Dockerfile`、`docker-compose.yml`、`deploy.env.example` |
| 密钥未进 Git | `.env`、含密码的 `application-local.properties` 不在仓库里 |
| 能推送到远端 | AWS 上的 EC2 能 `git clone` / `git pull`（GitHub/公司 Git） |
| 本地 Compose 仍正常 | `docker compose up -d --build`，http://localhost:8080 可登录 |

生产注意：

- `docker-compose.yml` 若映射了 `5432:5432`，**上 AWS 后应去掉公网暴露**（仅容器内互通即可）  
- 路径用英文：服务器上建议 `/opt/employee-mgmt`，不要用日文目录名  

---

## 第 3 步：写好生产配置清单（部署前）

在服务器上将创建 `.env`（不要提交 Git），至少：

```env
DB_PASSWORD=这里换成强密码
```

可选（需要邮件时）：

- `config/application-local.properties`（SMTP）

准备好：

- 部门是否改默认树 → 有则改 `scripts/seed-company-master.sql`  
- 上线后要用的真实管理员姓名/邮箱（建用户用）  

---

## 第 4 步：开通 AWS（有权限则自己做）

### 4.1 创建 EC2

| 项 | 建议 |
|----|------|
| 区域 | ap-northeast-1（东京） |
| OS | **Ubuntu 24.04 LTS**（已选定；勿再选 22.04） |
| 规格 | t3.medium 或同等（2 vCPU / 4GB+） |
| 磁盘 | 50～100GB gp3 |
| 密钥对 | 下载 `.pem`，妥善保管 |

### 4.2 安全组

| 端口 | 来源 | 说明 |
|------|------|------|
| 22 | 仅你的公网 IP | SSH |
| 8080 或 443 | 仅公司 VPN/固定 IP | 业务访问 |
| 5432 | **不开放** | 数据库 |

### 4.3（可选）

- Elastic IP（固定 IP）  
- 域名 A 记录指向该 IP  
- 以后再加 HTTPS（ALB + ACM 或 Nginx + 证书）  

详细命令见 `deploy-linux.md`。

---

## 第 5 步：在 EC2 上部署（核心）

SSH 登录后按顺序：

```bash
# 1. 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
# 重新登录

# 2. 拉代码（路径示例）
sudo mkdir -p /opt/employee-mgmt
sudo chown "$USER":"$USER" /opt/employee-mgmt
cd /opt/employee-mgmt
git clone <你的仓库URL> .

# 3. 环境变量
cp deploy.env.example .env
nano .env   # 设置 DB_PASSWORD

# 4. 启动
docker compose up -d --build

# 5. 删演示社员（空库 + 保留部门）
docker compose exec -T postgres psql -U employee_app -d employee_mgmt < scripts/remove-demo-data.sql
```

自检：

```bash
docker compose ps
docker compose logs -f app
curl -I http://127.0.0.1:8080
```

浏览器（在允许的网络下）：`http://<EC2公网或弹性IP>:8080`

完整说明：`deploy-linux.md`。

---

## 第 6 步：上线当天你要做的验收

1. 用 `admin` / `admin123` 登录 → **立即改密码**（hr、user 同理或禁用）  
2. 在「用户管理」创建真实人事/营业账号  
3. 新建 1 名测试社员、上传 1 个附件，确认正常  
4. 让 1～2 名同事从公司网络访问并登录  
5. 把正式 URL 和初始说明发给使用者  

---

## 第 7 步：部署后立刻建立的运维习惯

| 事项 | 建议 |
|------|------|
| 备份 | 每天 `pg_dump`，文件拷到本机或 S3 |
| 更新程序 | `git pull` → `docker compose up -d --build` |
| 不要 | `docker compose down -v`（会删库和附件卷） |
| SSH 密钥 | `.pem` 不要进 Git、不要发给无关人员 |

备份示例：

```bash
docker compose exec -T postgres pg_dump -U employee_app employee_mgmt \
  > /opt/backup/employee_mgmt_$(date +%Y%m%d).sql
```

---

## 按优先级：你「今天 / 本周 / 上线周」做什么

### 今天就能做

1. 把 `aws-deployment-checklist.md` 发给同事，收回：账号权限、访问限制、谁开 EC2  
2. 确认 `employee-info-management` 已 push 到远端 Git  
3. 本地再跑一次 `docker compose up -d --build`，确认无问题  
4. 检查 compose：**生产不要对公网暴露 5432**

### 本周（拿到 AWS 权限后）

1. 创建东京区域 EC2 + 安全组（AMI：**Ubuntu 24.04 LTS**）  
2. 安装 Docker，clone 仓库到 `/opt/employee-mgmt`  
3. `.env` + `docker compose up -d --build`  
4. 执行 `remove-demo-data.sql`  
5. 浏览器登录改密  

### 上线周

1. 建真实用户、小范围验收  
2. 配备份  
3. 通知全员访问地址  
4.（可选）域名 + HTTPS  

---

## 暂时不用做的事

| 项目 | 原因 |
|------|------|
| 迁本机 PostgreSQL 全量数据 | 已定空库策略 |
| 先上 RDS / ECS / S3 | 方案1 足够起步，以后再升级 |
| 在 AWS 再装一份 PostgreSQL 到宿主机 | Compose 容器已自带 |
| 等中文版 Docker Desktop | 与部署无关 |

---

## 卡住时找谁

| 问题 | 找谁 |
|------|------|
| 没有 AWS 账号/付款 | 公司管理 / 基础设施 |
| 公司出口 IP、VPN | 基础设施 / IT |
| 域名、证书 | IT |
| 应用起不来、Flyway、登录 | 你（开发）对照 `deploy-linux.md` 日志 |
| 部门组织怎么建 | 人事 |

---

## 一句话

**你现在的主线：收齐 AWS 账号与访问限制 → 推好 Git → 开 EC2（Linux）→ 按 `deploy-linux.md` 部署 Compose → 删演示数据、改密、验收。**

以后本项目相关文档请统一写到：

`C:\zk\会社\work\employee-info-management\docs\`
