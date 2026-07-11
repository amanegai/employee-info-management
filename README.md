# 社員情報管理システム

派遣会社向けの社員情報管理画面です。React + Bootstrap のフロントエンドと、Java 21 + Spring Boot + SQLite のバックエンドで構成されています。

## 機能

### 一覧画面

| 区域 | 内容 |
|------|------|
| 上部サマリー | 在籍/稼働中/待機中/今月終了予定（クリックで絞り込み） |
| 検索 | 社員ID、社員名、所属部門（折りたたみ式） |
| 一覧 | 社員基本情報（行クリックで詳細へ） |
| 登録 | 新規社員登録モーダル |

### 詳細画面（5タブ）

| タブ | 内容 |
|------|------|
| 基本情報 | 概要・写真・個人情報 |
| スキル・資格・経歴 | スキル評価（★）、資格、職務経歴 |
| 勤怠・評価・メモ | 出勤率、評価履歴、メモ |
| 総合評価 | カテゴリ別評価表、総合評価サマリー |
| 給与・人事 | 基本給・通勤手当・年俸（管理者向け表示） |

操作：編集（準備中）、削除、一覧へ戻る

## 必要環境

- JDK 21+
- Maven 3.9+
- Node.js 20+

## 起動手順

### 推荐：双击启动（无需 Maven）

项目根目录双击 **`start-app.bat`**，或在 CMD 中：

```bat
start-app.bat
```

浏览器打开 **http://localhost:8080**。

> 本机未安装 Maven 时也可使用。后端已打包为 `backend\target\employee-management-1.0.0.jar`，只需 **Java 21** 和 **Node.js**。

### 仅启动后端（前端已构建时）

```bat
cd backend
start-backend.bat
```

### 需要重新打包后端时

```bat
cd backend
mvnw.cmd package -DskipTests
```

`mvnw.cmd` 会自动下载 Maven，无需全局安装 `mvn` 命令。

### 开发模式（热更新，可选）

后端与前端分开启动：

```bash
# 终端 1
cd backend && start-backend.bat

# 终端 2（本地 PowerShell 窗口）
.\start-frontend-dev.ps1
```

http://127.0.0.1:5173 を開く。Node.js 建议使用 **20 LTS**（见 `frontend/.nvmrc`）。

> Windows 上 Vite 开发服务器可能异常退出。日常使用时请优先采用 **start-app.bat**。

## API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/summary` | サマリー |
| GET | `/api/master` | マスタ |
| GET | `/api/employees` | 検索（summaryFilter 対応） |
| GET | `/api/employees/{id}/detail` | 詳細一式 |
| POST | `/api/employees` | 新規 |
| DELETE | `/api/employees/{id}` | 削除 |

## データベース

- `employee` + `department`：基本マスタ
- `employee_personal`, `employee_skill`, `employee_qualification`, `employee_career`
- `employee_attendance`, `employee_evaluation_history`, `employee_memo`
- `employee_evaluation_item`, `employee_overall_evaluation`, `employee_salary`

詳細テーブル定義：`backend/src/main/resources/detail-schema.sql`  
サンプル詳細データ：`detail-data.sql`（社員 ID=1）

## Docker Compose 部署（公司服务器）

| 环境 | 文档 | 一键初始化 |
|------|------|------------|
| Windows | [docs/deploy-docker.md](docs/deploy-docker.md) | `.\scripts\init-company-docker.ps1` |
| Linux | [docs/deploy-linux.md](docs/deploy-linux.md) | `./scripts/init-company-docker.sh` |

简要：提交含 `Dockerfile` / `docker-compose.yml` 的源码 → 服务器配置 `.env` → 运行初始化脚本（空库 + 部门主数据，不迁移本机库）→ 内网 `http://<服务器>:8080`。若需迁本机整库才用 `scripts/export-deploy-data.ps1`。

## 構成

```
社員情報管理/
├── backend/
├── docker-compose.yml
├── Dockerfile
└── frontend/
    └── src/
        ├── pages/          # 一覧・詳細
        └── components/detail/  # 詳細タブ部品
```
