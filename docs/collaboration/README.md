# 開発協働ドキュメント（社員情報管理 OA）

| 項目 | 内容 |
|------|------|
| 文書バージョン | 1.0 |
| 更新日 | 2026-07-14 |
| 適用範囲 | 既存 OA 上での**チーム開発協働**（機能追加・改修） |
| 言語 | 日本語優先（中国語版は後続） |
| Owner | Lead Developer |

> **本ディレクトリの対象は「開発協働リソース」です。**  
> 業務機能としての「人材・稼働リソース管理」設計は [`../basic-design/`](../basic-design/) を参照してください。

---

## 目的

複数名が同一リポジトリで後続機能を開発する際に、次を揃えます。

- どの環境・アカウント・秘密情報を使うか（リソース）
- どのモジュールを誰が主責・レビューするか（Ownership）
- どう分岐し、どうマージ・公開するか（Git / リリース）

---

## 文書一覧（読む順）

| No. | 文書 | 内容 |
|-----|------|------|
| 00 | 本文（本 README） | 索引と文書間の関係 |
| 01 | [リソース管理](01-resource-management-ja.md) | 環境、接続、鍵、共有テストデータ、禁止事項 |
| 02 | [モジュール Owner / 責務](02-module-ownership-ja.md) | 機能域別の主責・Reviewer・敏感変更ルール |
| 03 | [Git ブランチとリリース](03-git-branch-release-ja.md) | 分岐命名、Review ゲート、公開パス |

新規メンバーは次を推奨します。

1. [開発環境標準](../dev-environment-standard-ja.md) で本機を立ち上げる  
2. 本 README → 01 → 02 → 03 を読む  
3. 担当機能の [基本設計](../basic-design/README.md) を読む  

---

## 既存文書との関係

```text
docs/collaboration/          ← 開発チームの「どう協働するか」
        │
        ├─→ docs/dev-environment-standard-ja.md   （ツール版・本機構築）
        ├─→ docs/deploy-*.md                      （社内サーバー展開）
        ├─→ docs/basic-design/ / 系统設計書.md     （何を作るか・権限・API）
        └─→ AI-Development 03-collaboration-v0.1  （AI 利用・Review チェックリスト）
```

| 知りたいこと | 参照先 |
|--------------|--------|
| JDK / Node / DB の版と起動 | [dev-environment-standard-ja.md](../dev-environment-standard-ja.md) |
| 本番・社内 Docker | [deploy-docker.md](../deploy-docker.md) / [deploy-linux.md](../deploy-linux.md) |
| 機能の画面・API・権限 | [basic-design/](../basic-design/) ・ [系统設計書.md](../系统設計書.md) |
| AI 支援開発の 7 ステップと Review 一覧 | AI-Development `03-collaboration-v0.1.md` |

環境バージョンや起動コマンドの詳細は **重複記載しません**。本ディレクトリは「誰が・どのリソースを・どう扱うか」に特化します。

---

## 運用ルール（要約）

| # | ルール |
|---|--------|
| 1 | 基本設計承認前に大きな実装に入らない（協働規約と整合） |
| 2 | 秘密情報（`.env`、本番パスワード、SMTP 実値）はリポジトリに入れない |
| 3 | モジュール横断・敏感域（権限・給与・認証）は 02 のゲートを遵守 |
| 4 | マージ前に最低 1 名の Review（AI 生成コードは必須） |
| 5 | 文書と実態がズレたら **Lead が当該ドキュメントを更新**してから展開する |

---

## 改訂履歴

| 版 | 日付 | 内容 |
|----|------|------|
| 1.0 | 2026-07-14 | 初版（索引・01〜03） |
