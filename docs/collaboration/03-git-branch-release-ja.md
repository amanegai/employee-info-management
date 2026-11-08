# 03 Git ブランチとリリース

| 項目 | 内容 |
|------|------|
| 文書バージョン | 1.0 |
| 更新日 | 2026-07-14 |
| 言語 | 日本語（中国語版は後続） |
| Owner | Lead Developer |
| 関連 | [README](README.md) ・ [モジュール Owner](02-module-ownership-ja.md) ・ AI-Development `03-collaboration-v0.1.md` ・ [deploy-docker](../deploy-docker.md) / [deploy-linux](../deploy-linux.md) |

> 本約定は**文書運用を先行**し、CI 強制やブランチ保護のサーバ設定変更は当面必須としない。  
> リモートのデフォルトブランチ名が異なる場合は、下表の「安定線」をその名前に読み替える（多くは `main`）。

---

## 1. 目的

- 複数人の並行開発でも、安定線を壊さない
- Review と公開の順序を揃える
- Flyway 付き変更のマージ事故を減らす

---

## 2. ブランチ戦略

### 2.1 ブランチ種別

| 種別 | 命名 | 用途 |
|------|------|------|
| 安定線 | `main`（または現行デフォルト） | 常に起動可能・レビュー済みの状態を維持 |
| 機能 | `feature/<短い英数字-kebab>` | 新機能・大きな改修。例：`feature/hr-ops-payroll-fix` |
| 修正 | `fix/<短い英数字-kebab>` | バグ修正。例：`fix/login-session-timeout` |
| 文書 | `docs/<短い説明>` | ドキュメントのみ（任意。小変更は直接 PR でも可） |
| 緊急 | `hotfix/<短い説明>` | 社内稼働中の致命不具合。Lead 承認で短縮 Review 可 |

### 2.2 作業ルール

1. 着手前に安定線から最新を取得して分岐する  
2. 1 ブランチ＝1 主題（無関係なリファクタを同梱しない）  
3. 長期ブランチは安定線を定期的に取り込み、コンフリクトを溜めない  
4. 力技の履歴書き換え（force push to 安定線）は禁止。共有 feature への force も原則禁止  

---

## 3. マージ前ゲート（PR / 相互確認）

正式な Pull Request ツールが使えない場合も、**同等の確認**をチャットまたはレビュー記録で残す。

| ゲート | 基準 |
|--------|------|
| Reviewer | 実装者以外 **最低 1 名**（[02 Owner 表](02-module-ownership-ja.md) の既定 Reviewer 優先） |
| AI 生成コード | 必ず Review。チェックリストは `03-collaboration-v0.1` **付録 B** |
| 敏感変更 | [02 §4](02-module-ownership-ja.md) → Lead + 別 Reviewer |
| 動作確認 | 主要パスを本機または Compose で確認（PO 受入が必要な機能は PO 連携） |
| 文書 | UI / 権限 / API が変われば基本設計または操作マニュアルを同 PR か直後に更新 |

マージ先は原則 **安定線のみ**。feature → feature の積み上げは Lead 承認時のみ。

---

## 4. コミットメッセージ（推奨）

短く「なぜ」が分かる一文。例：

```text
fix: ログイン後のセッション切れで 401 ループしないよう処理

feat: 給与明細送付の宛先検証を追加
```

秘密情報・本番 URL・個人名をコミット本文に書かない。

---

## 5. Flyway を含む変更

| ルール | 内容 |
|--------|------|
| 番号 | `backend/src/main/resources/db/migration/postgresql/Vnn__*.sql` を次番号で追加。番号衝突時は後発が繰り上げ調整 |
| PR 説明 | 「新規 migration あり」と明記。破壊的変更は影響範囲を書く |
| 検証 | `postgres` profile で起動し Flyway 成功を確認してからマージ依頼 |
| SQLite | 正式変更として schema.sql のみの更新で済ませない |
| ロールバック | 原則は**前方修正**の新 migration。本番データを消す DOWN スクリプトは Lead 承認必須 |

---

## 6. リリースパス

```text
本機検証 (local)
    → （任意）docker compose 本機検証 (compose-local)
        → 社内サーバー Compose (company)
            → （将来）staging / 本番相当
```

| 段階 | 実施内容 | 参照 |
|------|----------|------|
| 本機 | `start-app` 等で機能確認。開発用パスワード可 | [開発環境標準](../dev-environment-standard-ja.md) |
| Compose 本機 | `.env` に強パスワード。イメージビルド確認 | [deploy-docker.md](../deploy-docker.md) |
| 社内 | ソース取得 → `.env` → `init-company-docker` / `compose up`。**開発既定パスワード不可** | deploy-docker / deploy-linux |

リリース担当は Lead または M10 Owner。リリース前チェック：

- [ ] 安定線に対象コミットが含まれる  
- [ ] 敏感変更があれば二重 Approve 済み  
- [ ] migration がある場合、対象環境で未適用バージョンのみが残っている想定かを確認  
- [ ] 秘密情報がリポジトリに混入していない  

---

## 7. コンフリクトと緊急対応

| 状況 | 対応 |
|------|------|
| 同ファイル競合 | 機能 Owner が裁定。認証・権限は Lead |
| 社内障害ホットフィックス | `hotfix/*` → 短縮 Review → 安定線 → 直ちに社内へ展開 → 必要なら feature 側へバックポート |
| 誤って秘密を push | 即座に Lead へ報告。鍵のローテと履歴除去方針を決定（独断で放置しない） |

---

## 8. やらないこと（本バッチ）

- CI 必須チェックの強制導入（別途提案）
- サーバ側ブランチ保護の必須化（推奨はするが文書のみ先行）
- `main` 以外の長期 `develop` 二本立て（必要になったら版上げで定義）

---

*ブランチ名の慣習やデフォルトブランチ名がリポジトリで変わった場合は、本文 §2 を先に更新すること。*
