# 01 リソース管理（開発協働）

| 項目 | 内容 |
|------|------|
| 文書バージョン | 1.0 |
| 更新日 | 2026-07-14 |
| 言語 | 日本語（中国語版は後続） |
| Owner | Lead Developer（秘密情報の最終責任） |
| 関連 | [README](README.md) ・ [開発環境標準](../dev-environment-standard-ja.md) ・ [deploy-docker](../deploy-docker.md) / [deploy-linux](../deploy-linux.md) |

> 本ドキュメントは**開発・検証で使う共有リソース**の台帳とルールです。  
> 業務機能としての「人材リソース」設計ではありません。

---

## 1. 目的

- 環境・接続・鍵・テストデータの**所在と責任者**を明確にする
- 「誰のマシンのどのパスワードか」が不明なまま作業することを防ぐ
- 本番に開発用デフォルトを持ち込まない

---

## 2. 環境一覧

| 環境 ID | 用途 | 典型エントリ | DB | パスワード方針 | 担当（氏名） |
|---------|------|--------------|-----|----------------|--------------|
| `local` | 日常開発 | `http://localhost:8080` | 本機 PostgreSQL 16 またはローカル Compose | 開発既定 `employee_app_dev` 可 | 各開発者 |
| `compose-local` | 本番相当のイメージ検証 | Compose `:8080` | コンテナ `postgres` | `.env` の **強いパスワード** | 実施者（一時） |
| `company` | 社内サーバー | 内網 `http://<server>:8080` | Compose 永続ボリューム | `.env` 強パスワード・定期ローテ | （記入） |
| `staging` | （将来）検証専用 | 未定義なら `company` と兼用 | — | 本番と同水準 | （記入） |

構築・版の詳細は [開発環境標準](../dev-environment-standard-ja.md) を正とする。  
社内展開手順は [deploy-docker.md](../deploy-docker.md) / [deploy-linux.md](../deploy-linux.md)。

---

## 3. データストア接続

### 3.1 PostgreSQL（標準）

| 項目 | `local` 既定値 | `company` / Compose |
|------|----------------|---------------------|
| Host | `localhost:5432` | サービス名 `postgres` またはサーバー公開 |
| Database | `employee_mgmt` | 同左 |
| User | `employee_app` | 同左 |
| Password | `employee_app_dev` | `.env` の `DB_PASSWORD` |
| 初期化 | `scripts/setup-postgres.sql` | `scripts/init-company-docker.*` |

**禁止：** `employee_app_dev` を社内サーバー・顧客提示環境に使用すること。

### 3.2 SQLite（レガシー）

| 項目 | 内容 |
|------|------|
| 用途 | 移行・考古学のみ。**新機能の開発基準にしない** |
| Profile | `--spring.profiles.active=sqlite` |
| ファイル | `backend` 作業下の SQLite DB（Git 管理外） |

### 3.3 ファイルストレージ

| 項目 | 内容 |
|------|------|
| 設定キー | `app.files.storage-dir` |
| `local` 既定 | `./data/files`（backend 作業ディレクトリ相対） |
| Compose | ボリューム `employee-files` → `/app/data/files` |
| 注意 | DB に絶対パスが入ると他環境で壊れる。環境間コピー時はパス方針を Lead に確認 |

---

## 4. 秘密情報（シークレット）台帳

| リソース | 保管場所 | Git | 責任者（氏名） | ローテ方針 |
|----------|----------|-----|----------------|------------|
| Compose `DB_PASSWORD` | サーバー／本機 `.env` | 不可（`deploy.env.example` のみ可） | （記入） | 委譲・退職・漏洩疑い時 |
| SMTP 実アカウント | `backend/config/application-local.properties` | 不可（`.example` のみ可） | （記入） | パスワード変更時に文書も更新 |
| 本番相当 DB ダンプ | ローカル暗号化領域／共有ドライブ（社内規程） | **不可** | （記入） | 用済み後削除 |
| AI / LLM API Key | 社内 Key 管理（個人 `.env` 等） | 不可 | （記入） | プロバイダ側と同期 |

テンプレート：

- `.env` ← [`deploy.env.example`](../../deploy.env.example)
- SMTP ← [`backend/config/application-local.properties.example`](../../backend/config/application-local.properties.example)

氏名欄はキックオフ後に Lead が確定し、空欄のまま運用しないこと。

---

## 5. 共有テスト・デモ用アカウント

空 DB + Flyway 後に自動作成される開発用アカウント（詳細は [系统設計書](../系统設計書.md) §10）：

| ユーザー名 | パスワード | ロール | 利用範囲 |
|------------|------------|--------|----------|
| admin | admin123 | ADMIN | `local` / 検証のみ |
| hr | hr123 | HR | `local` / 検証のみ |

ルール：

- 営業・事業部ロールが必要な場合は **ユーザー管理画面で開発用ユーザーを追加**し、本表に追記する（本番ユーザーは書かない）
- 実在社員の個人情報を含むマスデータは、必要な場合のみ Lead 承認のうえ共有。リポジトリへコミットしない
- デモ後は可能ならパスワード変更またはアカウント無効化

---

## 6. Git に載せてはいけない成果物

以下は `.gitignore` と運用で二重に守る：

| パス / パターン | 理由 |
|-----------------|------|
| `.env` | DB 秘密 |
| `backend/config/application-local.properties` | SMTP 等 |
| `backend/data/`、`*.db` | ローカルデータ |
| `frontend/node_modules/`、`frontend/dist/` | 依存・ビルド |
| `backend/target/`、`backend/src/main/resources/static/` | ビルド成果 |
| 本番 `pg_dump` / 顧客データ | 機密 |

---

## 7. AI・外部ツールへの露出境界

詳細は AI-Development `03-collaboration-v0.1.md` 第 5 章に従う。要約：

| 渡してよい | 渡してはいけない |
|------------|------------------|
| 承認済み基本設計、非機密コード断片、権限マトリクス（公開部分） | 本番パスワード、API Key、接続文字列、社員 PII 一括、契約・未公開見積 |

プロンプトに `.env` や `application-local.properties` の中身を貼らない。

---

## 8. リソース変更時の手続き

新しい環境・共有アカウント・外部サービス（SMTP 等）を追加する場合：

1. Lead に用途・期間・責任者を連絡  
2. 本ドキュメントの該当表（§2〜§5）を更新  
3. 必要なら [開発環境標準](../dev-environment-standard-ja.md) / deploy 文書へリンク追加  
4. チームに周知（双週同期またはチャット）

削除・無効化時も同様に台帳を更新する。

---

## 9. 禁止事項（抜粋）

| # | 禁止 |
|---|------|
| 1 | 開発用 DB パスワードを本番・社内 Compose に流用 |
| 2 | 秘密ファイルの Git コミット / チャットへの平文共有 |
| 3 | 他開発者のローカル DB を黙って上書きする（合意なき dump 投入） |
| 4 | `docker compose down -v` による社内データ消去（意図と承認なし） |
| 5 | SQLite profile を新しいチーム標準として推奨すること |

---

## 付録：責任者記入欄

| 役割 | 氏名 | 更新日 |
|------|------|--------|
| Lead Developer（全体） | | |
| 社内サーバー（`company`）管理者 | | |
| SMTP / メール設定管理者 | | |
| 秘密情報ローテ窓口 | | |

---

*リソースの実値が変わったら、先に本表を直し、その後にサーバ設定を変える。*
