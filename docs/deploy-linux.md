# 社員情報管理 — Linux 服务器 Docker 部署指南

公司 **Linux 服务器**（Ubuntu / Debian / CentOS / RHEL 等）安装 Docker 后，用本文说明部署步骤。  
应用镜像基于 Linux 构建，**比 Windows 更适合生产部署**。

Windows 服务器请参阅 [deploy-docker.md](deploy-docker.md)。

---

## 一、环境要求

| 项目 | 要求 |
|------|------|
| 操作系统 | **Ubuntu 24.04 LTS**（推荐，AWS 已选定）、Debian 12+、RHEL 8+ 等 |
| Docker | 20.10+ |
| Docker Compose | v2（`docker compose` 插件） |
| CPU / 内存 | 建议 **2 核 4GB+**（营业约 10 人 + 人事 2 人规模足够） |
| 磁盘 | 建议 **20GB+**（数据库 + 上传文件） |
| 网络 | 内网放行 **TCP 8080**（或经 Nginx 反代 443） |

服务器**不需要**单独安装 JDK、Node.js、PostgreSQL（均在容器内构建/运行）。

---

## 二、安装 Docker

### Ubuntu / Debian

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
# 重新登录后生效；或当前会话：newgrp docker

docker --version
docker compose version
```

### 开机自启（可选）

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 三、部署目录（推荐纯英文路径）

```text
/opt/employee-mgmt/                 ← 项目根（git clone 或解压）
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── deploy.env.example
├── .env                            ← 仅服务器本地创建，勿提交 Git
├── frontend/                       ← 源码（镜像内 npm run build）
├── backend/                        ← 含 mvnw、src/
├── scripts/
│   ├── init-company-docker.sh      ← Linux 一键初始化
│   └── remove-demo-data.sql
├── docs/
└── config/                         ← 可选，SMTP 等
    └── application-local.properties
```

### 获取源码

**方式 1：Git（推荐）**

```bash
sudo mkdir -p /opt/employee-mgmt
sudo chown "$USER:$USER" /opt/employee-mgmt
cd /opt/employee-mgmt
git clone <公司仓库地址> .
```

**方式 2：Zip 上传**

在本机打包项目（**排除** `node_modules`、`backend/target`、`.env`），解压到 `/opt/employee-mgmt`。

**不要**只拷贝 JAR，需完整源码以便 `docker compose build`。

---

## 四、配置秘密信息

```bash
cd /opt/employee-mgmt
cp deploy.env.example .env
nano .env   # 或 vim
```

`.env` 示例：

```env
DB_PASSWORD=请设置强密码
```

勿提交 Git：`.env`、`config/application-local.properties`（含 SMTP 密码）。

---

## 五、首次部署

### 方式 A：一键初始化（推荐，空库 + 删演示社员）

```bash
cd /opt/employee-mgmt
chmod +x scripts/init-company-docker.sh
./scripts/init-company-docker.sh
```

可选参数：

```bash
./scripts/init-company-docker.sh --skip-demo-removal    # 保留演示社员（仅测试）
./scripts/init-company-docker.sh --replace-departments   # 按 seed-company-master.sql 替换部门
```

### 方式 B：手动分步

```bash
cd /opt/employee-mgmt
docker compose up -d --build

# 等待 postgres healthy 后删除演示社员
docker compose exec -T postgres psql -U employee_app -d employee_mgmt \
  -v ON_ERROR_STOP=1 < scripts/remove-demo-data.sql
```

### 确认启动

```bash
docker compose ps
docker compose logs -f app
```

日志出现 `Started ...Application` 即成功。浏览器访问：

```text
http://<服务器内网IP>:8080
```

---

## 六、首次启动后必做

设计书默认账号（空库自动创建），**上线后立即改密或禁用**：

| 用户 | 默认密码 |
|------|----------|
| admin | admin123 |
| hr | hr123 |

人事担当：

1. 使用 `admin` 登录 → 修改密码  
2. **用户管理**：创建营业 / 人事真实账号（角色、部门）  
3. **社员登録**：录入真实社员（空库开始）  
4. 取引先・案件等按业务需要逐步登记  

---

## 七、访问地址（交给 IT）

应用无单独「域名配置项」，访问地址 = **服务器 IP/域名 + 端口**。

### 方式 A：内网 IP + 端口（最简单）

```text
http://192.168.1.50:8080
```

防火墙放行：内网 → 服务器 **TCP 8080**。

### 方式 B：内网 DNS

内网 DNS 增加 A 记录，例如 `hr-app.company.local` → 服务器 IP：

```text
http://hr-app.company.local:8080
```

### 方式 C：Nginx 反向代理 + HTTPS（推荐生产）

用户访问 `https://hr.example.com`，Nginx 转发到 `127.0.0.1:8080`。

`/etc/nginx/sites-available/employee-mgmt` 示例：

```nginx
server {
    listen 443 ssl http2;
    server_name hr.example.com;

    ssl_certificate     /etc/ssl/certs/hr.example.com.pem;
    ssl_certificate_key /etc/ssl/private/hr.example.com.key;

    client_max_body_size 55m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/employee-mgmt /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS 反代时，在 `config/application-local.properties` 增加：

```properties
server.forward-headers-strategy=framework
```

并在 `docker-compose.yml` 的 `app` 服务中取消 config 卷注释后重启。

### 方式 D：直接使用 80 端口

若 80 端口空闲，可改 `docker-compose.yml`：

```yaml
ports:
  - "80:8080"
```

则访问 `http://192.168.1.50`（仍建议仅内网）。

---

## 八、邮件功能（可选）

```bash
mkdir -p /opt/employee-mgmt/config
cp backend/config/application-local.properties.example \
   config/application-local.properties
nano config/application-local.properties
```

`docker-compose.yml` 中 `app.volumes` 取消注释：

```yaml
volumes:
  - employee-files:/app/data/files
  - ./config:/app/config:ro
```

```bash
docker compose up -d
```

---

## 九、日常运维

| 操作 | 命令 |
|------|------|
| 更新代码并重新部署 | `git pull && docker compose up -d --build` |
| 仅重启应用 | `docker compose restart app` |
| 查看状态 | `docker compose ps` |
| 查看日志 | `docker compose logs -f app` |
| 进入数据库 | `docker compose exec postgres psql -U employee_app -d employee_mgmt` |
| 停止（保留数据） | `docker compose down` |
| 强制重建镜像 | `docker compose build --no-cache app && docker compose up -d` |

⚠️ **不要**随意执行 `docker compose down -v`（`-v` 会删除数据库与上传文件卷）。

界面更新后若像旧版，浏览器 **Ctrl+F5** 强制刷新。

---

## 十、备份与恢复

### 数据库备份

```bash
mkdir -p /backup/employee-mgmt
docker compose exec -T postgres pg_dump -U employee_app employee_mgmt \
  > /backup/employee-mgmt/employee_mgmt_$(date +%Y%m%d).sql
```

建议 cron 每日执行，例如：

```cron
0 2 * * * cd /opt/employee-mgmt && docker compose exec -T postgres pg_dump -U employee_app employee_mgmt > /backup/employee-mgmt/employee_mgmt_$(date +\%Y\%m\%d).sql
```

### 上传文件

文件保存在 Docker 卷 `employee-files`（容器内 `/app/data/files`）。备份卷数据：

```bash
docker run --rm \
  -v employee-mgmt_employee-files:/data:ro \
  -v /backup/employee-mgmt:/backup \
  alpine tar czf /backup/files_$(date +%Y%m%d).tar.gz -C /data .
```

（卷名以 `docker volume ls` 实际为准，一般为 `employee-mgmt_employee-files`。）

### 从本机迁移整库（可选）

若开发机已有正式数据：

**本机导出：**

```bash
pg_dump -U employee_app -h localhost employee_mgmt > employee_mgmt_backup.sql
# 附件目录：backend/data/files 或 app.files.storage-dir
```

**服务器导入：**

```bash
cd /opt/employee-mgmt
docker compose up -d
docker compose exec -T postgres psql -U employee_app -d employee_mgmt < employee_mgmt_backup.sql
docker compose cp ./data/files/. app:/app/data/files/
```

> 若 DB 中 `storage_path` 含 Windows 绝对路径（`C:\...`），迁到 Linux 后部分旧附件预览/下载可能异常；新环境空库部署无此问题。

---

## 十一、与 AI 面接系统同机

使用**两个目录、两套 compose**，端口勿冲突：

```text
/opt/employee-mgmt/      → 8080（社员系统）
/opt/interview-assist/     → 8081（面接系统，另仓库）
```

各自独立的 `.env` 与数据库卷，互不共用。

---

## 十二、环境变量说明

| 变量 | 作用 |
|------|------|
| `DB_PASSWORD` | PostgreSQL 与 Spring 数据源密码（`.env`） |
| `SPRING_DATASOURCE_URL` | Compose 内已设为 `jdbc:postgresql://postgres:5432/employee_mgmt` |
| `APP_FILES_STORAGE_DIR` | 容器内 `/app/data/files`，持久化卷 `employee-files` |

---

## 十三、故障排查

| 现象 | 处理 |
|------|------|
| `docker compose up` 构建失败 | `docker compose logs app`；确认磁盘空间、内存；可 `build --no-cache` |
| 8080 无法访问 | `ss -tlnp \| grep 8080`；检查防火墙 `ufw` / `firewalld` |
| Flyway 迁移失败 | `docker compose logs app` 查看 SQL 错误；勿手动改 `flyway_schema_history` 除非清楚后果 |
| 登录后立刻掉线 | 检查反代是否设置 `X-Forwarded-Proto`；配置 `server.forward-headers-strategy=framework` |
| 上传失败 | Nginx `client_max_body_size` 至少 55m；应用限制 50MB |

---

## 十四、给 IT 的一页说明（可复制）

```text
服务：社員情報管理（Docker Compose）
服务器：Linux，内网 IP _______________
部署目录：/opt/employee-mgmt
容器：employee-mgmt-app（8080）、employee-mgmt-db（PostgreSQL 16）
访问方式（选一）：
  [ ] http://<IP>:8080
  [ ] http://<内网主机名>:8080
  [ ] https://<域名>（Nginx 反代 127.0.0.1:8080）
防火墙：公司内网访问上述端口
备份：每日 pg_dump + 文件卷（见 docs/deploy-linux.md）
外网：默认不开放（含人事/薪资数据）
```

---

*文档版本：与 Docker 部署文件同步（2026-06）*
