# 社員情報管理 — Docker Compose 部署指南

公司 **Windows 服务器**安装 Docker 后，用本文说明**本地要准备什么**、**服务器要做什么**。

> **Linux 服务器**请参阅 [deploy-linux.md](deploy-linux.md)（含 `scripts/init-company-docker.sh` 一键初始化）。

---

## 一、本地需要准备什么（发布前清单）

### 1. 源代码（必须）

确保以下内容进入 Git 或能完整拷贝到服务器（**不要只拷 JAR**）：

| 路径 | 说明 |
|------|------|
| `Dockerfile` | 镜像构建 |
| `docker-compose.yml` | 编排 |
| `.dockerignore` | 减小构建上下文 |
| `deploy.env.example` | 密码模板（复制为 `.env`） |
| `frontend/` | 源码（镜像内会 `npm run build`） |
| `backend/` | 含 `mvnw`、`.mvn`、`pom.xml`、`src/` |

推荐：**提交并 push** 到公司 Git，服务器 `git clone`；或打包 zip（排除 `node_modules`、`backend/target`）。

### 2. 秘密信息（本地生成，勿提交 Git）

在**服务器**上从模板创建 `.env`（本地可先想好强密码）：

```powershell
copy deploy.env.example .env
# 编辑 .env，设置 DB_PASSWORD=强密码
```

**不要**提交：

- `.env`
- `backend/config/application-local.properties`（含 SMTP 密码等）

需要邮件时，在服务器创建 `config/application-local.properties`（参考 `backend/config/application-local.properties.example`），并在 `docker-compose.yml` 中取消 `config` 卷注释。

### 3. 本机已有业务数据时（可选但重要）

若本机 PostgreSQL / 附件里已是**正式数据**，发布前要准备迁移包：

| 内容 | 本地操作 |
|------|----------|
| 数据库 | `pg_dump -U employee_app -h localhost employee_mgmt > employee_mgmt_backup.sql` |
| 附件 | 复制整个 `backend/data/files` 或你配置的 `app.files.storage-dir` 目录 |

将 `employee_mgmt_backup.sql` 和文件目录随部署说明交给服务器导入（见下文「数据迁移」）。

> DB 里若记录了**本机绝对路径**（如 `C:\...\files\xxx`），迁到 Linux 容器后预览/下载可能异常，需统一路径策略或批量更新 `storage_path`；新环境空库部署则无此问题。

### 4. 本地自测（推荐）

本机已装 Docker Desktop 时，在项目根目录：

```powershell
copy deploy.env.example .env
# 编辑 .env 填入测试密码
docker compose up -d --build
```

若报错 **`project name must not be empty`**：因项目文件夹名含日文，Compose 无法自动命名。`docker-compose.yml` 已设置 `name: employee-mgmt`；仍失败时可执行：

```powershell
$env:COMPOSE_PROJECT_NAME = "employee-mgmt"
docker compose up -d --build
```

浏览器打开 http://localhost:8080，确认能登录、Flyway 迁移成功。测完：

```powershell
docker compose down
```

### 4.1 本地发布最新程序（改代码之后）

代码有更新时，在**项目根目录**执行（`.env` 已存在则不必再 copy）：

```powershell
cd "C:\zk\会社\work\社員情報管理"
docker compose up -d --build
```

说明：

| 项 | 行为 |
|----|------|
| `--build` | 按最新源码重新构建 `app` 镜像并重启容器 |
| 数据库 | `postgres` 卷保留，**数据不会丢** |
| 上传文件 | `employee-files` 卷保留 |
| DB 结构变更 | 启动时 Flyway 自动执行新迁移（`db/migration/postgresql`） |

查看是否启动成功：

```powershell
docker compose ps
docker compose logs -f app
```

浏览器访问 http://localhost:8080 ，若界面像旧的，用 **Ctrl+F5** 强制刷新。

仅重启、不重新构建（未改代码，只改了 `.env` 等配置）：

```powershell
docker compose up -d
docker compose restart app
```

构建结果异常、怀疑缓存时：

```powershell
docker compose build --no-cache app
docker compose up -d
```

**不要**随意执行 `docker compose down -v`（`-v` 会删除卷，**清空数据库和上传文件**）。

开发时若不想每次重建镜像，可继续用 **`start-app.bat`** 或 `start-frontend-dev.ps1` + 后端；确认无误后再 `docker compose up -d --build` 验证容器部署。

### 5. 上线安全（本地/服务器都要做）

设计书默认账号（空库自动创建）上线后**必须修改或禁用**：

| 用户 | 默认密码 |
|------|----------|
| admin | admin123 |
| hr | hr123 |
| user | user123 |

### 6. 本地不必再装到服务器上的东西

使用 Compose 在服务器构建时，服务器**不需要**单独安装 JDK、Node、PostgreSQL（均在容器内）。本地开发仍可用原有 `start-app.bat`。

---

## 二、服务器需要准备什么（交给 IT）

1. 安装 **Docker** + **Compose 插件**（Linux 容器模式）
2. 内网防火墙放行 **TCP 8080**
3. 部署目录，例如 `D:\deploy\employee-mgmt\`（**路径建议纯英文**，见下节）
4. 创建 `.env`（强 `DB_PASSWORD`）

### 服务器目录结构（推荐）

在 Windows 服务器上建议如下布局（**不要**把项目放在含日文的路径下，以免 Docker 异常；用英文目录名即可）：

```text
D:\deploy\
└── employee-mgmt\                    ← 项目根（git clone 或解压源码到此）
    ├── docker-compose.yml
    ├── Dockerfile
    ├── .dockerignore
    ├── deploy.env.example
    ├── .env                          ← 仅服务器本地创建，勿提交 Git
    ├── frontend\                     ← 源码（构建进镜像）
    ├── backend\
    ├── scripts\
    │   ├── init-company-docker.ps1
    │   ├── remove-demo-data.sql
    │   └── seed-company-master.sql
    ├── docs\
    └── config\                       ← 可选，自行创建
        └── application-local.properties   ← SMTP 等（参考 backend/config/*.example）

D:\backup\employee-mgmt\              ← 可选，与项目分离的备份存放处
    ├── db_20260603.sql               ← pg_dump 输出
    └── README.txt
```

**不必**在服务器上单独建 `PostgreSQL 数据目录` 或 `uploads` 文件夹：当前 `docker-compose.yml` 使用 Docker **命名卷** `pgdata`、`employee-files`，数据由 Docker 管理（卷位置一般在 Docker Desktop 的 WSL/虚拟机内）。

| 路径 | 是否必须 | 说明 |
|------|----------|------|
| `D:\deploy\employee-mgmt\` 整棵源码树 | ✅ | 含 `Dockerfile`、`docker-compose.yml`、`frontend`、`backend` |
| `.env` | ✅ | 从 `deploy.env.example` 复制并填写 `DB_PASSWORD` |
| `config\application-local.properties` | 任意 | 需邮件功能时创建，并取消 compose 里 config 卷注释 |
| `node_modules\`、`backend\target\` | ❌ 不要拷 | 在镜像构建时生成，拷贝反而慢且易出错 |
| `D:\backup\...` | 推荐 | 定期 `pg_dump` 与运维脚本输出 |

**获取源码的两种方式：**

1. **Git（推荐）**：`git clone <仓库地址> D:\deploy\employee-mgmt`
2. **Zip**：在本机打包项目（排除 `node_modules`、`target`、`.env`），解压到 `D:\deploy\employee-mgmt\`

**与 AI 面接系统同机时：**

```text
D:\deploy\
├── employee-mgmt\      ← 社员系统，端口 8080
└── interview-assist\   ← 面接系统，端口 8081（另仓库、另 compose）
```

两套目录、两套 `.env`，互不共用数据库卷。
5. 时间同步正常（MFA TOTP）
6. 定期备份：`pg_dump` + 文件卷

---

## 访问网址如何配置（交给 IT）

社员系统**没有单独的前端域名配置项**：浏览器访问的地址 = 公司给服务器配的 **主机名/IP + 端口**。Docker 默认把容器 **8080** 映射到服务器 **8080**（见 `docker-compose.yml` 的 `ports: "8080:8080"`）。

### 方式 A：内网 IP + 端口（最简单，推荐先用）

1. 确认服务器固定内网 IP，例如 `192.168.1.50`
2. 防火墙放行：**内网 → 服务器 TCP 8080**
3. 告诉同事访问：

```text
http://192.168.1.50:8080
```

无需改程序、无需改 `docker-compose.yml`。

### 方式 B：内网域名（好记，仍用 8080 端口）

由 IT 在 **内网 DNS**（Active Directory DNS 等）增加记录，例如：

| 类型 | 名称 | 指向 |
|------|------|------|
| A | `employee-mgmt` 或 `hr-app` | `192.168.1.50` |

同事访问：

```text
http://employee-mgmt.company.local:8080
```

（`company.local` 换成贵司真实内网域后缀。）

应用仍监听 8080，**只在 DNS 里多一个名字**，Compose 一般不用改。

### 方式 C：用 80 / 443 端口（网址里不写 :8080）

需要 IT 在服务器上增加 **反向代理**（Windows 常用 **IIS**，或 **Nginx**），把公网/内网的 80 或 443 转发到本机 `127.0.0.1:8080`。

示例（概念）：

```text
用户访问  https://hr.bitcross.co.jp
        → IIS / Nginx（443）
        → http://127.0.0.1:8080  （Docker 映射的社员系统）
```

要点：

- 社员 JAR 内前端与 `/api` **同域**，代理时建议 **整站根路径 /** 转发，不要只代理 `/api`
- 上 **HTTPS** 时向 IT 申请内网证书或正式证书
- 若登录/会话异常，可在 `application-local.properties` 或环境变量中设置 Spring Boot 信任代理头（由 IT 与开发一起调）：`server.forward-headers-strategy=framework`

也可不改 IIS，仅把 Docker 端口改成 80（需管理员权限、且 80 不能被别的网站占用）：

```yaml
# docker-compose.yml 中 app 的 ports 改为例如：
ports:
  - "80:8080"
```

则访问：`http://192.168.1.50` 或 `http://employee-mgmt.company.local`（**仍建议仅内网**）。

### 方式 D：子路径（不推荐）

例如 `http://intranet.company.com/hr/` 需要改 Spring `context-path` 并重新打包前端资源路径，**当前项目未按此方式设计**，除非有专门开发，否则请用 **根路径 /**（方式 A～C）。

### 不需要在应用里配置的项

| 项 | 说明 |
|----|------|
| 前端 `api.js` | 生产构建后请求 **相对路径** `/api/...`，与访问域名无关 |
| `docker-compose.yml` | 默认无需为「网址」单独加环境变量 |
| 本机 `localhost` | 仅你自己电脑；同事必须用 **服务器 IP/域名** |

### 给 IT 的一页说明（可复制）

```text
服务：社員情報管理（Docker Compose）
服务器：Windows，内网 IP _______________
容器端口：8080（映射宿主机 8080）
希望访问方式（选一）：
  [ ] http://<IP>:8080
  [ ] http://<内网主机名>:8080  （DNS A 记录指向该 IP）
  [ ] https://<域名>            （IIS/Nginx 反代到 127.0.0.1:8080）
防火墙：允许公司内网访问上述端口
外网：默认不开放（含人事/薪资数据）
```

### 部署完成后自测

在同事电脑上打开 IT 提供的地址，能出现**登录页**即成功；不要用 `localhost`（那是每人自己的电脑）。

---

## 三、服务器部署步骤

```powershell
cd D:\deploy\employee-mgmt
git pull   # 或解压最新源码

copy deploy.env.example .env
notepad .env   # 设置 DB_PASSWORD

docker compose up -d --build
docker compose ps
docker compose logs -f app
```

同事访问：`http://<服务器内网IP>:8080`

### 公司初期：不迁移本机库，只保留必须主数据

**不需要**把本机 PostgreSQL / Docker 测试库 `pg_dump` 到公司服务器。公司用**全新空库**即可。

#### 首次启动时系统会自动做什么

| 来源 | 内容 | 生产环境是否保留 |
|------|------|------------------|
| Flyway `V1`～`V16` | 表结构 | ✅ 必须 |
| Flyway `V2` | **部门** 10 件 + **演示社员** E001～E015 | 部门 ✅ / 演示社员 ❌ 建议删 |
| Flyway `V14` | 演示社员 **E2008（周凱）** 及明细 | ❌ 建议删 |
| 应用 `AuthDataInitializer` | 登录账号 admin / hr / user（空库时） | ✅ 改密后使用 |
| 代码 `MasterData` | 职位、雇用形態、稼働状態、評価等下拉项 | ✅ 自动（不在 DB） |

**「必须 master」** 在公司环境一般指：

1. **部门**（`department`）— Flyway V2 已写入默认树，多数情况可直接用  
2. **登录账号** — 首次启动自动创建，上线后改密并在「用户管理」建真实账号  
3. **下拉主数据**（职位等）— 已在程序里，无需导入  

**社员・客户・案件・附件** 等业务数据：上线后由人事/营业在画面录入，或以后另做 CSV/导入（与本次无关）。

#### 推荐：一键初始化（服务器项目根目录）

```powershell
copy deploy.env.example .env
notepad .env   # DB_PASSWORD

.\scripts\init-company-docker.ps1
```

脚本会：`docker compose up -d --build` → 执行 `remove-demo-data.sql` 删除演示社员 → 保留默认部门。

若贵司部门与默认不同，先编辑 `scripts/seed-company-master.sql`，再执行：

```powershell
.\scripts\init-company-docker.ps1 -ReplaceDepartments
```

（须在无社员数据时替换部门；脚本会在删演示社员后导入。）

#### 手动分步（与脚本等价）

```powershell
docker compose up -d --build
Get-Content .\scripts\remove-demo-data.sql | docker compose exec -T postgres psql -U employee_app -d employee_mgmt
```

#### 上线当天人事必做

1. 使用 `admin` 登录 → **立即修改** admin / hr / user 密码（或禁用测试账号）  
2. **用户管理**：创建各担当真实登录账号（关联部门、角色）  
3. **社员登録**：录入真实社员（空列表开始，无本机数据）  
4. 取引先・案件等按业务需要逐步登记  

#### 勿与公司 Docker 混淆

| 环境 | 数据 |
|------|------|
| 本机 `start-app.bat` + 本机 PostgreSQL | 本机开发数据，**不会**进公司 Docker |
| 本机 Docker Compose 测试 | 本机 Docker 卷，**不会**自动进公司服务器 |
| 公司服务器 Docker | **独立新库**，按上文初始化 |

### 更新版本

```powershell
git pull
docker compose up -d --build
```

### 数据迁移（本机已有库）

```powershell
# 1. 先启动空栈，等 postgres healthy
docker compose up -d

# 2. 导入（在项目根目录，备份文件放当前目录）
Get-Content .\employee_mgmt_backup.sql | docker compose exec -T postgres psql -U employee_app -d employee_mgmt

# 3. 附件复制到卷（示例）
docker compose cp .\data\files\. app:/app/data/files/
```

### 备份

```powershell
docker compose exec postgres pg_dump -U employee_app employee_mgmt > D:\backup\employee_mgmt_%date%.sql
```

---

## 四、环境变量说明

| 变量 | 作用 |
|------|------|
| `DB_PASSWORD` | PostgreSQL 与 Spring 数据源密码（`.env`） |
| `SPRING_DATASOURCE_URL` | Compose 内已设为 `jdbc:postgresql://postgres:5432/employee_mgmt` |
| `APP_FILES_STORAGE_DIR` | 容器内 `/app/data/files`，持久化卷 |

---

## 五、与 AI 面接系统同机

请使用**两个目录、两套 compose**，端口 **8080**（社员）与 **8081**（面接）不要冲突。

---

## 附录：Docker Desktop 英文界面对照

Docker Desktop **官方暂无中文界面**，Settings 里通常也**没有 Language 选项**。部署社员系统以本文档与命令行为主即可；浏览器中的社员系统界面仍为中文。

### 状态栏（窗口左下角）

| 英文 | 含义 | 说明 |
|------|------|------|
| Engine running | 引擎运行中 | 正常，可执行 `docker` / `docker compose` |
| Engine stopped | 引擎已停止 | 需启动 Docker Desktop |
| Starting... | 正在启动 | 首次或更新后多等几分钟 |

### 左侧菜单

| 英文 | 含义 |
|------|------|
| Containers | 容器（正在运行或已退出的实例） |
| Images | 镜像（构建产物，如 `employee-management:1.0.0`） |
| Volumes | 数据卷（数据库、上传文件等持久化存储） |
| Builds | 构建记录（`docker compose build` 历史） |
| Docker Hub | 官方镜像仓库（一般可不点） |
| Extensions | 扩展插件 |

### Settings（右上角齿轮）常用项

| 路径 | 含义 |
|------|------|
| General → Start Docker Desktop when you sign in | 登录 Windows 时自动启动 |
| General → Use the WSL 2 based engine | 使用 WSL2 引擎（Windows 推荐勾选） |
| Resources → Advanced | CPU / 内存上限（构建慢时可适当加大 Memory） |
| Docker Engine | 守护进程 JSON 配置（一般不用改） |
| Troubleshoot → Restart / Clean / Purge data | 重启、清理、重置（慎用 Purge） |

### 容器页常见按钮与状态

| 英文 | 含义 |
|------|------|
| Run / Start | 启动 |
| Stop | 停止 |
| Delete | 删除容器 |
| Open in browser | 在浏览器打开映射端口（若有） |
| Running | 运行中 |
| Exited | 已退出 |

### 与本项目相关的命令（在 PowerShell 执行，不依赖英文菜单）

| 命令 | 作用 |
|------|------|
| `docker compose up -d --build` | 构建并后台启动社员系统 |
| `docker compose ps` | 查看容器状态 |
| `docker compose logs -f app` | 查看应用日志 |
| `docker compose down` | 停止并删除容器（卷保留） |
| `docker compose restart app` | 仅重启应用容器 |

社员系统容器名（`docker-compose.yml` 中定义）：`employee-mgmt-app`、`employee-mgmt-db`。

### WSL 相关提示（Windows）

若 Docker 提示 **WSL needs updating** 或 PowerShell 找不到 `wsl` 命令，在**管理员** PowerShell 执行：

```powershell
C:\Windows\System32\wsl.exe --install
C:\Windows\System32\wsl.exe --update
```

完成后重启电脑，再打开 Docker Desktop → **Try Again**。

### 第三方中文界面（可选，非官方）

若仍希望 Docker Desktop 窗口显示中文，可使用社区汉化包（替换 `app.asar`），例如 [DockerDesktop-CN](https://github.com/asxez/DockerDesktop-CN/releases)。

- 须与当前 Docker Desktop **版本号完全一致**（如 4.76.0）
- 替换前备份：`C:\Program Files\Docker\Docker\frontend\resources\app.asar`
- 自动更新后汉化可能失效，需重新替换
- 公司电脑请遵守信息安全规定；**生产服务器**建议保持官方英文界面

---

*文档版本：与 Docker 部署文件同步（2026-06）*
