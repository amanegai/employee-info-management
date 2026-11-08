# 社員情報管理 — 开发环境标准

| 项目 | 内容 |
|------|------|
| 文档版本 | 1.0 |
| 更新日 | 2026-07-14 |
| 适用范围 | 本仓库本地开发 / 联调（非本番服务器） |
| Owner | Lead Developer |
| 依据 | 现行源码：`pom.xml`、`frontend/package.json`、`Dockerfile`、`application.properties`、启动脚本 |
| 日语版 | [dev-environment-standard-ja.md](dev-environment-standard-ja.md) |

> 本番 / 社内服务器部署请参阅 [deploy-docker.md](deploy-docker.md)、[deploy-linux.md](deploy-linux.md)。  
> AI 辅助开发协作约定见 AI-Development 项目 `03-collaboration-v0.1.md`。

---

## 1. 目的与原则

| # | 原则 | 说明 |
|---|------|------|
| 1 | **版本锁定** | 工具版本与 `Dockerfile` / `engines` / `pom.xml` 一致，避免「本机能跑、他机不能」 |
| 2 | **PostgreSQL 优先** | 默认 profile 为 `postgres`；SQLite 仅遗留，不作为新功能开发基准 |
| 3 | **秘密不入库** | `.env`、`application-local.properties`、真实 SMTP 密码、本番 dump **禁止提交** |
| 4 | **一条主路径** | 日常推荐 `start-app.bat` / `start-app.ps1`；热更新仅作可选 |
| 5 | **构建产物不提交** | `frontend/dist`、`backend/target`、`node_modules`、`static/` 由脚本生成 |

---

## 2. 技术栈与版本标准

### 2.1 必装软件（版本上限 / 下限）

| 软件 | 标准版本 | 校验方式 | 备注 |
|------|----------|----------|------|
| JDK | **21**（LTS） | `java -version` | 推荐 Eclipse Temurin；与 `pom.xml` / Dockerfile 一致 |
| Maven | **3.9+**（可选） | — | 优先使用仓库内 `backend/mvnw.cmd`，无需全局安装 |
| Node.js | **20 LTS**（`>=20 <23`） | `node -v` | 以 `frontend/.nvmrc`（`20`）为准；Node 24 可跑但不推荐 |
| npm | 随 Node 自带 | `npm -v` | 使用 `package-lock.json`，勿随意改包管理器 |
| PostgreSQL | **16** | `psql --version` | 与 Docker 镜像 `postgres:16-alpine` 一致 |
| Git | 2.x | `git --version` | 工作区根目录为本仓库 |
| Docker Desktop | 可选 | `docker -v` | 用于本机联调 Compose 或与服务器一致的验证 |

### 2.2 运行时技术约定

| 层次 | 标准选型 | 版本来源 |
|------|----------|----------|
| 前端 | React 19 + React Router 7 + Bootstrap 5 + Vite 6 | `frontend/package.json` |
| 后端 | Spring Boot 3.4.x + Spring Security + JDBC | `backend/pom.xml` |
| DB 迁移 | Flyway（仅 PostgreSQL） | `classpath:db/migration/postgresql` |
| 时区 | `Asia/Tokyo` | 容器 / 应用统一 |

### 2.3 端口标准

| 服务 | 端口 | 说明 |
|------|------|------|
| Spring Boot（含打包前端） | **8080** | 主入口；日常浏览器打开此地址 |
| Vite 开发服务器 | **5173** | 仅热更新模式；`/api` 代理到 8080 |
| PostgreSQL | **5432** | 本机或 Docker 暴露 |

同一台机器不得占用冲突端口；启动脚本会尝试释放 8080。

---

## 3. 目录与工程结构标准

```
employee-info-management/   （或日文路径「社員情報管理」）
├── frontend/               # React SPA（Vite）
│   ├── .nvmrc              # Node 版本钉选
│   ├── package.json
│   └── src/
│       ├── pages/          # 画面
│       ├── components/     # 组件
│       ├── api.js          # API 客户端（credentials: include）
│       └── auth.js         # 前端权限判断
├── backend/
│   ├── mvnw / mvnw.cmd     # Maven Wrapper（标准构建入口）
│   ├── config/             # 本地覆盖配置（example 可提交，真实文件不提交）
│   └── src/main/
│       ├── java/jp/dispatch/employee/
│       │   ├── controller / service / repository / auth / config / dto / model
│       └── resources/
│           ├── application.properties
│           └── db/migration/postgresql/
├── scripts/                # DB 初始化、部署辅助
├── docs/                   # 设计 / 手册 / 本标准
├── docker-compose.yml
├── Dockerfile
├── start-app.bat / .ps1    # 推荐启动
└── start-frontend-dev.ps1  # 可选热更新
```

| 包 / 目录 | 职责（新增代码须遵守） |
|-----------|------------------------|
| `controller` | REST 入口，薄层，不写复杂业务 |
| `service` | 业务逻辑 |
| `repository` | JdbcTemplate SQL |
| `auth` | 认证、权限、数据范围 |
| `config` | Security、SPA、定时任务等 |
| `frontend/src/pages` | 按路由一页一文件（或明确子目录） |
| `frontend/src/api.js` | 统一 HTTP；页面不直接散落 `fetch`（既有模式） |

---

## 4. 本机环境搭建标准流程

### 4.1 一次性安装清单

1. 安装 **JDK 21**，配置 `JAVA_HOME`（或确保 `java` 在 PATH，脚本可自动探测常见安装路径）
2. 安装 **Node.js 20 LTS**（建议 nvm-windows / fnm，读取 `frontend/.nvmrc`）
3. 安装 **PostgreSQL 16**（本机服务），或准备 Docker Desktop 仅跑数据库
4. Clone 本仓库到本地；路径尽量避免仅中文导致的工具兼容问题（Compose 已设 `name: employee-mgmt`）

### 4.2 数据库初始化（必做）

默认连接（与 `application.properties` 一致）：

| 项 | 值 |
|----|-----|
| Host | `localhost:5432` |
| Database | `employee_mgmt` |
| User | `employee_app` |
| Password | `employee_app_dev`（**仅开发用**） |

执行标准脚本（需 postgres 超级用户）：

```powershell
psql -U postgres -h localhost -f scripts/setup-postgres.sql
```

若本机 locale 与脚本中 `Japanese_Japan.932` 不匹配导致建库失败，可改为：

```sql
CREATE DATABASE employee_mgmt ENCODING 'UTF8' TEMPLATE template0;
```

再按脚本后半段授权给 `employee_app`。

首次启动应用时 **Flyway 自动迁移** schema；空库会创建初始账号（见 §7）。

### 4.3 依赖安装与首次构建

```powershell
# 前端
cd frontend
npm install
npm run build

# 后端（将 dist 打入 JAR）
cd ..\backend
.\mvnw.cmd package -DskipTests
```

日常可不手动执行：使用根目录 `start-app.ps1` 会自动 `npm install` / `build` / 按需 `mvnw package`。

### 4.4 验收标准（环境 OK 判定）

| 检查项 | 期望 |
|--------|------|
| 浏览器访问 | `http://localhost:8080` 出现登录页 |
| 登录 | 能使用 §7 初始账号进入主画面 |
| API | 登录后 `/api/summary` 等返回 200（非 401） |
| 日志 | 无 Flyway / 数据源连接失败栈 |

---

## 5. 启动方式标准

### 5.1 推荐：一体化启动（与本番相近）

```bat
start-app.bat
```

或：

```powershell
.\start-app.ps1
```

行为：前端 build → 必要时打包 JAR → `java -jar` 监听 **8080**。  
适用：日常功能开发、演示、验收。

### 5.2 可选：前后端分离热更新

| 终端 | 操作 |
|------|------|
| 1 | `cd backend` → `start-backend.bat` 或 `java -jar target\employee-management-1.0.0.jar` |
| 2 | 项目根目录 `.\start-frontend-dev.ps1` |

- 前端：`http://127.0.0.1:5173`
- API：Vite 将 `/api` 代理到 `http://127.0.0.1:8080`
- **注意**：Windows 上 Vite 可能异常退出；不稳定时改回 §5.1

### 5.3 Docker Compose 本机验证（可选）

用于验证与服务器一致的镜像链路：

```powershell
copy deploy.env.example .env
# 编辑 DB_PASSWORD
docker compose up -d --build
```

打开 `http://localhost:8080`。测完：`docker compose down`（勿加 `-v` 除非刻意清库）。

---

## 6. 配置与机密标准

### 6.1 允许提交 vs 禁止提交

| 文件 | Git | 说明 |
|------|-----|------|
| `application.properties` | ✅ | 开发默认（含开发用 DB 密码占位） |
| `deploy.env.example` | ✅ | 模板 |
| `backend/config/application-local.properties.example` | ✅ | SMTP 模板 |
| `.env` | ❌ | Compose 密码 |
| `backend/config/application-local.properties` | ❌ | 真实 SMTP 等 |
| `*.db` / `backend/data/` | ❌ | 本地数据 |
| `frontend/dist/`、`backend/target/` | ❌ | 构建产物 |

### 6.2 本地覆盖 SMTP（可选）

```powershell
copy backend\config\application-local.properties.example backend\config\application-local.properties
# 填写后：
java -jar backend\target\employee-management-1.0.0.jar --spring.config.additional-location=file:./config/
```

开发默认 `app.mail.enabled=false`，可不配邮件。

### 6.3 Profile 标准

| Profile | 用途 | 何时使用 |
|---------|------|----------|
| `postgres`（默认） | Flyway + PostgreSQL | **所有新开发、联调、验收** |
| `sqlite` | 遗留本地库 | **禁止**用于新功能基准；与 Flyway 不同步 |

启动显式指定示例：

```bat
java -jar employee-management-1.0.0.jar --spring.profiles.active=postgres
```

---

## 7. 开发用账号与数据

空库由迁移脚本自动创建：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | ADMIN |
| hr | hr123 | HR |

规则：

- 仅用于本地 / 验证环境
- **不得**将上述密码用于本番；社内服务器上线后立即修改
- 演示用业务数据可通过 `scripts/seed-company-master.sql` 等脚本按需导入；勿把本番 dump 随便提交仓库

文件存储默认目录：`backend` 工作目录下 `./data/files`（`app.files.storage-dir`）。

---

## 8. 日常开发约定（从现有程序提炼）

### 8.1 前端

| 约定 | 标准 |
|------|------|
| Node | 使用 20；进入 `frontend` 后先 `nvm use`（或等价工具） |
| 模块 | ESM（`"type": "module"`） |
| API | 经 `api.js`，带 `credentials: 'include'`（Session Cookie） |
| 权限 | 前端 `auth.js` 与后端 `SecurityService` 对齐；改权限两边同步 |
| 构建 | 生产静态资源进 `frontend/dist`，再由 Maven 复制到 JAR `classpath:/static/` |
| 宿主 | Vite 绑定 `127.0.0.1`，`strictPort: true` |

### 8.2 后端

| 约定 | 标准 |
|------|------|
| Java | 21；包名 `jp.dispatch.employee.*` |
| 数据访问 | JdbcTemplate；表结构变更走 **Flyway 新版本脚本**（`Vnn__*.sql`） |
| API 前缀 | `/api/**` |
| 安全 | Session + MFA；新增接口在 `SecurityConfig` 中明确规则 |
| 测试 | `backend` 下 `mvnw test`；已有单元/集成测（含 Testcontainers） |

### 8.3 数据库变更流程

1. 在 `backend/src/main/resources/db/migration/postgresql/` 新增下一序号迁移文件  
2. 本地用 PostgreSQL 启动验证 Flyway 成功  
3. 同步更新基本设计 / 系统設計書中相关表说明（按协作约定）  
4. **不要**只改 SQLite 的 `schema.sql` 作为正式变更

### 8.4 推荐 IDE / 编码

| 项 | 建议 |
|----|------|
| IDE | IntelliJ IDEA / Cursor / VS Code |
| 字符集 | UTF-8 |
| 换行 | 仓库混合；Shell/脚本注意 CRLF（Docker 构建已对 `mvnw` 做 dos2unix） |
| 格式 | 后端跟随现有 Java 风格；前端 JSX 与邻近文件一致，勿整仓大格式化 |

---

## 9. 常用命令速查

| 目的 | 命令 |
|------|------|
| 一键启动 | `.\start-app.ps1` 或 `start-app.bat` |
| 前端依赖 | `cd frontend; npm install` |
| 前端开发服 | `.\start-frontend-dev.ps1` |
| 仅后端 JAR | `cd backend; .\start-backend.bat` |
| 重新打包 | `cd backend; .\mvnw.cmd package -DskipTests` |
| 跑测试 | `cd backend; .\mvnw.cmd test` |
| 建库 | `psql -U postgres -h localhost -f scripts/setup-postgres.sql` |
| Compose 验证 | `docker compose up -d --build` |

---

## 10. 故障排查要点

| 现象 | 处理 |
|------|------|
| 找不到 Java | 安装 Temurin 21，或设 `JAVA_HOME`；可用 `find-java.bat` |
| 连接拒绝 5432 | 确认 PostgreSQL 服务启动；账号库是否按 §4.2 创建 |
| Flyway 失败 | 检查是否误用 sqlite；查看 migration 冲突；勿混用旧 SQLite 逻辑 |
| 8080 占用 | 关闭占用进程后重开 `start-app`（脚本会尝试释放） |
| Vite 闪退 | 改用一体化启动；确认 Node 为 20 |
| 前端白屏但 API 通 | 重新 `npm run build` 再打包 JAR |
| Compose `project name` 错误 | 已配置 `name: employee-mgmt`；仍失败时设 `$env:COMPOSE_PROJECT_NAME='employee-mgmt'` |

---

## 11. 环境差异对照

| 项目 | 开发（本机） | 会社服务器（Compose） |
|------|--------------|------------------------|
| DB 密码 | `employee_app_dev` | `.env` 中强密码 |
| 入口 | JAR 直启或 Vite | `employee-mgmt-app` 容器 :8080 |
| 静态资源 | build 进 JAR | 镜像多阶段 build |
| 邮件 | 默认关闭 | `application-local` 可选挂载 |
| 文档 | 本文 | `deploy-*.md` |

开发人员**不得**假设本番使用开发默认密码。

---

## 12. 相关文档

| 文档 | 说明 |
|------|------|
| [README.md](../README.md) | 快速启动摘要 |
| [dev-environment-standard-ja.md](dev-environment-standard-ja.md) | 本标准的日语版 |
| [系统設計書.md](系统設計書.md) | 架构、权限、API、初始账号 |
| [basic-design/README.md](basic-design/README.md) | 功能別基本設計 |
| [deploy-docker.md](deploy-docker.md) | Windows 部署 |
| [deploy-linux.md](deploy-linux.md) | Linux 部署 |
| [collaboration/README.md](collaboration/README.md) | 开发协同（日语：リソース・Owner・Git） |
| AI-Development `03-collaboration-v0.1.md` | AI 辅助开发协作与 Review |

---

## 附录 A：环境自检表（新人 / 换机）

- [ ] JDK 21 可用，`JAVA_HOME` 正确  
- [ ] Node 20（`node -v` 符合 `>=20 <23`）  
- [ ] PostgreSQL 16，`employee_mgmt` / `employee_app` 已创建  
- [ ] `frontend` 下 `npm install` 成功  
- [ ] `start-app` 后能打开 `http://localhost:8080` 并登录  
- [ ] 未误把 `.env` / 本地密码文件加入提交  
- [ ] 已阅读本标准与系统設計書 §10（账号与安全）  

---

*本文档根据仓库现行代码与脚本整理；工具版本升级时须同步修订 §2，并评估 Dockerfile / CI 一致性。*
