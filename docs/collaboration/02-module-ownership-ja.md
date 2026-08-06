# 02 モジュール Owner / 責務

| 項目 | 内容 |
|------|------|
| 文書バージョン | 1.0 |
| 更新日 | 2026-07-14 |
| 言語 | 日本語（中国語版は後続） |
| Owner | Lead Developer |
| 関連 | [README](README.md) ・ [basic-design](../basic-design/README.md) ・ [系统設計書](../系统設計書.md) |

> 氏名はキックオフ後に記入する。空欄時は **Lead Developer が当該域の暫定 Owner かつ Reviewer 手配責任**を負う。  
> 自分の書いたコードを自ら最終 Review のみで完結させない（交差 Review）。

---

## 1. 目的

- 機能域ごとの**主責（Owner）**と**既定 Reviewer**を明確にする
- 変更時に「誰に相談し、誰が Approve するか」を迷わせない
- 敏感域（認証・権限・給与・Flyway・Security）の追加ゲートを定義する

業務仕様の正は基本設計書。本ドキュメントは**開発協働上の責任分界**のみを扱う。

---

## 2. 役割定義

| 役割 | 責務 |
|------|------|
| **Owner** | 当該域の設計整合・実装品質の一次責任。他者の横断変更を受け付け、マージ判断を支援 |
| **Reviewer** | Review チェックリスト（AI-Development `03-collaboration-v0.1` 付録 B）に基づく確認。Owner と別人であること |
| **Lead** | 域に Owner 未割当、または域横断・紛争時の最終判断。グローバル兜底 |

Product Owner（営業・人事）は受入基準と業務確認を担う。コード Reviewer の代用にはしない。

---

## 3. 機能域マスタ（Owner 表）

| ID | 機能域 | 基本設計 | 主なコード（目安） | Owner | 既定 Reviewer |
|----|--------|----------|-------------------|-------|---------------|
| M01 | 認証・ユーザー・監査 | [01](../basic-design/01-認証とユーザー管理.md) | `AuthController`, `AuthUserController`, `AuditLogController`, `auth/`, `SecurityConfig`, `LoginPage`, `UserManagementPage`, `AccountSecurityPage`, `auth.js` | （記入） | （記入） |
| M02 | 社員管理 | [02](../basic-design/02-社員管理.md) | `EmployeeController`, `Employee*Page`, `components/detail/` | （記入） | （記入） |
| M03 | 案件・選考・マッチング・配属 | [03](../basic-design/03-案件と選考.md) ・ [project-workflow](../project-workflow-design.md) | `DispatchProjectController`, `ProjectCandidateController`, `ProjectMatchController`, `EmployeeProjectAssignmentController`, `Project*Page`, `ProjectMatchPage` | （記入） | （記入） |
| M04 | 社員状態・配属取消フォロー | [04](../basic-design/04-社員状態と配属フォロー.md) | `EmployeeStatusController`, `AssignmentCancelFollowupController`, `EmployeeStatusSuggestionsPage`, `AssignmentCancelFollowupsPage` | （記入） | （記入） |
| M05 | 取引先 | [05](../basic-design/05-取引先管理.md) | `ClientController`, `Client*Page` | （記入） | （記入） |
| M06 | 顧客活動・議事録・課題 | [06](../basic-design/06-顧客活動と議事録.md) | `ClientEventController`, `ClientMeetingController`, `ClientIssueController`, 対応 `*Page` | （記入） | （記入） |
| M07 | ファイル管理 | [07](../basic-design/07-ファイル管理.md) | `FileAttachmentController`, `FileManagementPage` | （記入） | （記入） |
| M08 | 人事業務（給与明細・証明書等） | [08](../basic-design/08-人事業務.md) | `HrOps*Controller`, `HrOps*Page` | （記入） | （記入） |
| M09 | 会議室予約 | [09](../basic-design/09-会議室予約.md) | `MeetingRoomController`, `MeetingRoomReservationController`, `MeetingRoomCalendarPage`, `components/meetingRoom/*` | （記入） | （記入） |
| M10 | インフラ・展開・共通基盤 | deploy / 環境標準 | `Dockerfile`, `docker-compose.yml`, `scripts/`, Flyway 共通、起動スクリプト | Lead 固定 | （記入） |

域が複数にまたがる変更は、**影響の大きい側の Owner を主**、他域 Owner を必須 CC（レビュー依頼）とする。

---

## 4. 敏感変更ゲート

次のいずれかを含む PR / マージは、通常 Review に加え **Lead + 別 Reviewer の二重確認**（協働規約第 6 章と整合）：

| 種別 | 典型パス・行為 |
|------|----------------|
| 認証・セキュリティ | `SecurityConfig`, Session/MFA, `/auth/**` |
| 権限・データ範囲 | `SecurityService`, `DataScopeService`, `frontend/src/auth.js` |
| 給与・人事機密 | `employee_salary`, HrOps 給与・送付、画面の給与タブ |
| スキーマ破壊的変更 | Flyway で DROP / 大量 UPDATE、データ削除を伴う migration |
| 本番接続・秘密 | `.env` テンプレ変更、デフォルトパスワード方針の変更 |

単なる文言修正・CSS は通常ゲートでよい。判断に迷ったら Lead に上げる。

---

## 5. 変更時の最低手続き

1. 担当域を本表で特定し、Owner に着手を通知（短文で可）  
2. 基本設計が未更新の仕様変更なら、先に設計を直すか差分合意を取る  
3. 実装後、既定 Reviewer（または Lead 手配の別人）へ Review 依頼  
4. 敏感ゲート該当なら Lead にも Approve を求める  
5. マージ後、必要なら操作マニュアル / 基本設計の同期更新（Owner 責任）

---

## 6. Owner 不在時

| 状況 | 対応 |
|------|------|
| Owner 未記入 | Lead が暫定 Owner |
| Owner 休暇・離脱 | Lead が代理を指名し、本表を更新 |
| 域間で意見対立 | Lead が裁定。必要なら Sponsor へエスカレーション |

---

## 7. 新規モジュール追加時

新機能域を切る場合：

1. `docs/basic-design/` に設計書を追加（番号継続）  
2. 本表に行を追加（ID・パス・Owner・Reviewer）  
3. [README](README.md) の索引から辿れることを確認  

---

## 付録：割当メモ（キックオフ記入用）

| 氏名 | 主に担当する ID | Review 可能域 | 備考 |
|------|-----------------|---------------|------|
| | | | |
| | | | |
| | | | |

*割当が変わったら同日中に本表を更新すること。*
