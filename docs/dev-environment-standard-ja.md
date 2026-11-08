# 社員情報管理 — 開発環境標準

| 項目 | 内容 |
|------|------|
| 文書バージョン | 1.0 |
| 更新日 | 2026-07-14 |
| 適用範囲 | 本リポジトリのローカル開発 / 結合確認（本番サーバー以外） |
| Owner | Lead Developer |
| 根拠 | 現行ソース：`pom.xml`、`frontend/package.json`、`Dockerfile`、`application.properties`、起動スクリプト |
| 中国語版 | [dev-environment-standard.md](dev-environment-standard.md) |

> 本番 / 社内サーバー展開は [deploy-docker.md](deploy-docker.md)、[deploy-linux.md](deploy-linux.md) を参照。  
> AI 支援開発の協働規約は AI-Development プロジェクトの `03-collaboration-v0.1.md` を参照。

---

## 1. 目的と原則

| # | 原則 | 説明 |
|---|------|------|
| 1 | **バージョン固定** | ツール版は `Dockerfile` / `engines` / `pom.xml` と一致させる。「自機では動く・他機では動かない」を防ぐ |
| 2 | **PostgreSQL 優先** | デフォルト profile は `postgres`。SQLite はレガシーのみで、新機能の開発基準にしない |
| 3 | **秘密情報をリポジトリに入れない** | `.env`、`application-local.properties`、実 SMTP パスワード、本番 dump は **コミット禁止** |
| 4 | **主経路は一本** | 日常は `start-app.bat` / `start-app.ps1` を推奨。ホットリロードは任意 |
| 5 | **ビルド成果物はコミットしない** | `frontend/dist`、`backend/target`、`node_modules`、`static/` はスクリプトで生成 |

---

## 2. 技術スタックとバージョン標準

### 2.1 必須ソフトウェア（上限 / 下限）

| ソフトウェア | 標準バージョン | 確認方法 | 備考 |
|--------------|----------------|----------|------|
| JDK | **21**（LTS） | `java -version` | Eclipse Temurin 推奨。`pom.xml` / Dockerfile と一致 |
| Maven | **3.9+**（任意） | — | リポジトリ内 `backend/mvnw.cmd` を優先。グローバル導入不要 |
| Node.js | **20 LTS**（`>=20 <23`） | `node -v` | `frontend/.nvmrc`（`20`）基準。Node 24 は動作可だが非推奨 |
| npm | Node 同梱 | `npm -v` | `package-lock.json` を使用。パッケージマネージャの無断変更禁止 |
| PostgreSQL | **16** | `psql --version` | Docker イメージ `postgres:16-alpine` と一致 |
| Git | 2.x | `git --version` | 作業ルートは本リポジトリ |
| Docker Desktop | 任意 | `docker -v` | 本機 Compose 連携、またはサーバーと同構成の検証用 |

### 2.2 ランタイム技術の取り決め

| 層 | 標準選定 | バージョン出典 |
|----|----------|----------------|
| フロント | React 19 + React Router 7 + Bootstrap 5 + Vite 6 | `frontend/package.json` |
| バックエンド | Spring Boot 3.4.x + Spring Security + JDBC | `backend/pom.xml` |
| DB マイグレーション | Flyway（PostgreSQL のみ） | `classpath:db/migration/postgresql` |
| タイムゾーン | `Asia/Tokyo` | コンテナ / アプリで統一 |

### 2.3 ポート標準

| サービス | ポート | 説明 |
|----------|--------|------|
| Spring Boot（フロント同梱） | **8080** | メイン入口。日常はブラウザでこの URL を開く |
| Vite 開発サーバー | **5173** | ホットリロード時のみ。`/api` を 8080 へプロキシ |
| PostgreSQL | **5432** | 本機または Docker 公開 |

同一マシンでポート衝突させないこと。起動スクリプトは 8080 の解放を試みる。

---

## 3. ディレクトリ・プロジェクト構成標準

```
employee-info-management/   （または日本語パス「社員情報管理」）
├── frontend/               # React SPA（Vite）
│   ├── .nvmrc              # Node バージョン固定
│   ├── package.json
│   └── src/
│       ├── pages/          # 画面
│       ├── components/     # コンポーネント
│       ├── api.js          # API クライアント（credentials: include）
│       └── auth.js         # フロント権限判定
├── backend/
│   ├── mvnw / mvnw.cmd     # Maven Wrapper（標準ビルド入口）
│   ├── config/             # ローカル上書き設定（example はコミット可、実ファイルは不可）
│   └── src/main/
│       ├── java/jp/dispatch/employee/
│       │   ├── controller / service / repository / auth / config / dto / model
│       └── resources/
│           ├── application.properties
│           └── db/migration/postgresql/
├── scripts/                # DB 初期化・展開補助
├── docs/                   # 設計 / マニュアル / 本標準
├── docker-compose.yml
├── Dockerfile
├── start-app.bat / .ps1    # 推奨起動
└── start-frontend-dev.ps1  # 任意ホットリロード
```

| パッケージ / ディレクトリ | 責務（新規コードで遵守） |
|---------------------------|--------------------------|
| `controller` | REST 入口。薄い層。複雑な業務は書かない |
| `service` | 業務ロジック |
| `repository` | JdbcTemplate SQL |
| `auth` | 認証・権限・データ範囲 |
| `config` | Security、SPA、定時タスクなど |
| `frontend/src/pages` | ルート単位で 1 画面 1 ファイル（または明確なサブディレクトリ） |
| `frontend/src/api.js` | HTTP を集約。画面での `fetch` 散在を避ける（既存パターン） |

---

## 4. 本機環境構築の標準手順

### 4.1 初回インストールチェックリスト

1. **JDK 21** を導入し `JAVA_HOME` を設定（または PATH に `java`）。スクリプトは一般的な導入先を自動検出可
2. **Node.js 20 LTS** を導入（nvm-windows / fnm 推奨。`frontend/.nvmrc` を参照）
3. **PostgreSQL 16** を本機サービスとして導入、または Docker Desktop で DB のみ起動
4. 本リポジトリを Clone。パスはツール互換のため極端な特殊文字を避ける（Compose は `name: employee-mgmt` 済み）

### 4.2 データベース初期化（必須）

デフォルト接続（`application.properties` と一致）：

| 項目 | 値 |
|------|-----|
| Host | `localhost:5432` |
| Database | `employee_mgmt` |
| User | `employee_app` |
| Password | `employee_app_dev`（**開発専用**） |

標準スクリプト実行（postgres スーパーユーザー要）：

```powershell
psql -U postgres -h localhost -f scripts/setup-postgres.sql
```

本機 locale がスクリプトの `Japanese_Japan.932` と合わず作成に失敗する場合は、以下に変更してよい：

```sql
CREATE DATABASE employee_mgmt ENCODING 'UTF8' TEMPLATE template0;
```

その後、スクリプト後半どおり `employee_app` に権限を付与する。

初回起動時に **Flyway がスキーマを自動適用**。空 DB では初期アカウントを作成する（§7 参照）。

### 4.3 依存インストールと初回ビルド

```powershell
# フロント
cd frontend
npm install
npm run build

# バックエンド（dist を JAR に同梱）
cd ..\backend
.\mvnw.cmd package -DskipTests
```

日常は手動不要。ルートの `start-app.ps1` が `npm install` / `build` / 必要時 `mvnw package` を実行する。

### 4.4 受入基準（環境 OK 判定）

| 確認項目 | 期待結果 |
|----------|----------|
| ブラウザアクセス | `http://localhost:8080` でログイン画面が表示される |
| ログイン | §7 の初期アカウントでメイン画面に入れる |
| API | ログイン後 `/api/summary` などが 200（401 でない） |
| ログ | Flyway / データソース接続失敗のスタックがない |

---

## 5. 起動方式の標準

### 5.1 推奨：一体起動（本番に近い）

```bat
start-app.bat
```

または：

```powershell
.\start-app.ps1
```

動作：フロント build → 必要時 JAR パッケージ → `java -jar` で **8080** 待受。  
用途：日常機能開発、デモ、受入。

### 5.2 任意：前後分離ホットリロード

| 端末 | 操作 |
|------|------|
| 1 | `cd backend` → `start-backend.bat`、または `java -jar target\employee-management-1.0.0.jar` |
| 2 | プロジェクトルートで `.\start-frontend-dev.ps1` |

- フロント：`http://127.0.0.1:5173`
- API：Vite が `/api` を `http://127.0.0.1:8080` へプロキシ
- **注意**：Windows 上で Vite が異常終了することがある。不安定なら §5.1 に戻す

### 5.3 Docker Compose 本機検証（任意）

サーバーと同系統のイメージ経路を検証する：

```powershell
copy deploy.env.example .env
# DB_PASSWORD を編集
docker compose up -d --build
```

`http://localhost:8080` を開く。確認後：`docker compose down`（意図的に DB を消す場合以外は `-v` を付けない）。

---

## 6. 設定と機密情報の標準

### 6.1 コミット可 vs 不可

| ファイル | Git | 説明 |
|----------|-----|------|
| `application.properties` | ✅ | 開発デフォルト（開発用 DB パスワード含む） |
| `deploy.env.example` | ✅ | テンプレート |
| `backend/config/application-local.properties.example` | ✅ | SMTP テンプレート |
| `.env` | ❌ | Compose 用パスワード |
| `backend/config/application-local.properties` | ❌ | 実 SMTP など |
| `*.db` / `backend/data/` | ❌ | ローカルデータ |
| `frontend/dist/`、`backend/target/` | ❌ | ビルド成果物 |

### 6.2 ローカル SMTP 上書き（任意）

```powershell
copy backend\config\application-local.properties.example backend\config\application-local.properties
# 記入後：
java -jar backend\target\employee-management-1.0.0.jar --spring.config.additional-location=file:./config/
```

開発デフォルトは `app.mail.enabled=false`。メール未設定でよい。

### 6.3 Profile 標準

| Profile | 用途 | 使用時機 |
|---------|------|----------|
| `postgres`（デフォルト） | Flyway + PostgreSQL | **すべての新規開発・結合・受入** |
| `sqlite` | レガシーローカル DB | 新機能の基準に **使わない**。Flyway と非同期 |

明示指定例：

```bat
java -jar employee-management-1.0.0.jar --spring.profiles.active=postgres
```

---

## 7. 開発用アカウントとデータ

空 DB ではマイグレーションが自動作成する：

| ユーザー名 | パスワード | ロール |
|------------|------------|--------|
| admin | admin123 | ADMIN |
| hr | hr123 | HR |

ルール：

- ローカル / 検証環境専用
- 上記パスワードを **本番に使わない**こと。社内サーバー稼働後は直ちに変更
- デモ用業務データは `scripts/seed-company-master.sql` 等で必要時に投入。本番 dump を安易にリポジトリへ入れない

ファイル保存先のデフォルト：`backend` 作業ディレクトリ下 `./data/files`（`app.files.storage-dir`）。

---

## 8. 日常開発の取り決め（現行プログラムから抽出）

### 8.1 フロントエンド

| 取り決め | 標準 |
|----------|------|
| Node | 20 を使用。`frontend` 入場後に `nvm use`（または同等ツール） |
| モジュール | ESM（`"type": "module"`） |
| API | `api.js` 経由。`credentials: 'include'`（Session Cookie） |
| 権限 | フロント `auth.js` とバックエンド `SecurityService` を整合。変更時は双方同期 |
| ビルド | 本番静的資産は `frontend/dist` → Maven が JAR の `classpath:/static/` へコピー |
| ホスト | Vite は `127.0.0.1` バインド、`strictPort: true` |

### 8.2 バックエンド

| 取り決め | 標準 |
|----------|------|
| Java | 21。パッケージ `jp.dispatch.employee.*` |
| データアクセス | JdbcTemplate。スキーマ変更は **Flyway 新規スクリプト**（`Vnn__*.sql`） |
| API プレフィックス | `/api/**` |
| セキュリティ | Session + MFA。新規 API は `SecurityConfig` で規則を明示 |
| テスト | `backend` で `mvnw test`。単体/結合（Testcontainers 含む）あり |

### 8.3 DB 変更フロー

1. `backend/src/main/resources/db/migration/postgresql/` に次番号のマイグレーションを追加  
2. 本機 PostgreSQL 起動で Flyway 成功を確認  
3. 基本設計 / システム設計書の関連表説明を同期更新（協働規約に従う）  
4. SQLite の `schema.sql` だけを正式変更と **しない**

### 8.4 推奨 IDE / 文字コード

| 項目 | 推奨 |
|------|------|
| IDE | IntelliJ IDEA / Cursor / VS Code |
| 文字セット | UTF-8 |
| 改行 | リポジトリ混在。Shell/スクリプトは CRLF に注意（Docker ビルドは `mvnw` を dos2unix） |
| 書式 | バックエンドは既存 Java スタイル。フロント JSX は近傍ファイルに合わせ、倉庫全体の大整形をしない |

---

## 9. よく使うコマンド早見

| 目的 | コマンド |
|------|----------|
| 一括起動 | `.\start-app.ps1` または `start-app.bat` |
| フロント依存 | `cd frontend; npm install` |
| フロント開発サーバー | `.\start-frontend-dev.ps1` |
| バックエンド JAR のみ | `cd backend; .\start-backend.bat` |
| 再パッケージ | `cd backend; .\mvnw.cmd package -DskipTests` |
| テスト実行 | `cd backend; .\mvnw.cmd test` |
| DB 作成 | `psql -U postgres -h localhost -f scripts/setup-postgres.sql` |
| Compose 検証 | `docker compose up -d --build` |

---

## 10. トラブルシュート要点

| 症状 | 対処 |
|------|------|
| Java が見つからない | Temurin 21 を導入、または `JAVA_HOME` 設定。`find-java.bat` 可 |
| 5432 接続拒否 | PostgreSQL サービス起動を確認。§4.2 どおり DB/ユーザー作成済みか |
| Flyway 失敗 | sqlite 誤用がないか、migration 衝突がないか確認。旧 SQLite ロジックと混ぜない |
| 8080 占有 | 占有プロセス終了後に `start-app` 再実行（スクリプトも解放を試行） |
| Vite が落ちる | 一体起動に切替。Node が 20 か確認 |
| フロント白画面だが API 通る | `npm run build` 後に JAR 再パッケージ |
| Compose `project name` エラー | `name: employee-mgmt` 済み。なお失敗時は `$env:COMPOSE_PROJECT_NAME='employee-mgmt'` |

---

## 11. 環境差異対照

| 項目 | 開発（本機） | 社内サーバー（Compose） |
|------|--------------|-------------------------|
| DB パスワード | `employee_app_dev` | `.env` の強力なパスワード |
| 入口 | JAR 直起動または Vite | `employee-mgmt-app` コンテナ :8080 |
| 静的資産 | build して JAR に同梱 | イメージ多段ビルド |
| メール | デフォルト無効 | `application-local` を任意マウント |
| 文書 | 本文 | `deploy-*.md` |

開発者は、本番が開発用デフォルトパスワードを使うと **想定してはならない**。

---

## 12. 関連文書

| 文書 | 説明 |
|------|------|
| [README.md](../README.md) | クイック起動概要 |
| [dev-environment-standard.md](dev-environment-standard.md) | 本標準の中国語版 |
| [系统設計書.md](系统設計書.md) | アーキテクチャ、権限、API、初期アカウント |
| [basic-design/README.md](basic-design/README.md) | 機能別基本設計 |
| [deploy-docker.md](deploy-docker.md) | Windows 展開 |
| [deploy-linux.md](deploy-linux.md) | Linux 展開 |
| [collaboration/README.md](collaboration/README.md) | **開発協働**（リソース・Owner・Git/リリース） |
| AI-Development `03-collaboration-v0.1.md` | AI 支援開発の協働と Review |

---

## 付録 A：環境セルフチェック（新人 / 端末交換）

- [ ] JDK 21 が使え、`JAVA_HOME` が正しい  
- [ ] Node 20（`node -v` が `>=20 <23`）  
- [ ] PostgreSQL 16、`employee_mgmt` / `employee_app` 作成済み  
- [ ] `frontend` で `npm install` 成功  
- [ ] `start-app` 後に `http://localhost:8080` を開きログインできる  
- [ ] `.env` / ローカルパスワードファイルを誤ってコミットしていない  
- [ ] 本標準とシステム設計書 §10（アカウントとセキュリティ）を読んだ  

---

*本ドキュメントはリポジトリの現行コードとスクリプトに基づく。ツール版アップ時は §2 を同期改訂し、Dockerfile / CI の整合を確認すること。*
