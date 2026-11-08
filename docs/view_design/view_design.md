# 画面仕様書（view_design）

| 項目 | 内容 |
|------|------|
| 文書バージョン | 1.3 |
| 更新日 | 2026-08-06 |
| 根拠 | `frontend/src/App.jsx` のルート定義 + [`../basic-design/`](../basic-design/) |
| 関連 | [基本設計書索引](../basic-design/README.md) ・ [システム設計書](../系统設計書.md) |

> パスは現行ルートを正とする。画面レイアウト・項目レベルの詳細は、各機能の基本設計「画面詳細」を参照。

---

## 1. 機能一覧

| No. | 機能 ID | 機能名 | 概要 | 主な利用者 | 基本設計 |
|-----|---------|--------|------|------------|----------|
| 01 | AUTH | 認証・ユーザー管理 | ログイン、MFA、アカウントセキュリティ、ユーザー管理、監査 | 全社員 / ADMIN | [01](../basic-design/01-認証とユーザー管理.md) |
| 02 | EMPLOYEE | 社員管理 | 一覧・詳細・登録/編集・インポート・評価 | 営業、人事、管理職 | [02](../basic-design/02-社員管理.md) |
| 03 | PROJECT | 案件・選考 | 案件 CRUD、マッチング、候補、配属、**BP求援・臨時候補・通知** | 営業、管理職（**HR は対象外**） | [03](../basic-design/03-案件と選考.md) |
| 04 | EMPLOYEE_STATUS | 社員状態・配属フォロー | 状態提案、配属取消フォロー | 営業、管理職（**HR は対象外**） | [04](../basic-design/04-社員状態と配属フォロー.md) |
| 05 | CLIENT | 取引先管理 | 取引先マスタ、担当者 | 営業、人事、管理職 | [05](../basic-design/05-取引先管理.md) |
| 06 | CLIENT_CRM | 顧客活動・議事録 | イベント、議事録・課題 | 営業、人事、管理職 | [06](../basic-design/06-顧客活動と議事録.md) |
| 07 | FILE | ファイル管理 | アップロード、分類、勤怠/経費同期 | 全ログインユーザー | [07](../basic-design/07-ファイル管理.md) |
| 08 | HR_OPS | 人事業務 | 証明書、申請、給与明細、取引先送付 | 人事 / ADMIN | [08](../basic-design/08-人事業務.md) |
| 09 | MEETING_ROOM | 会議室予約 | 会議室マスタ、週次カレンダーでの予約・取消 | 全ログインユーザー（管理権限は別） | [09](../basic-design/09-会議室予約.md) |

サイドメニューの表示と権限ガードはシステム設計書 §3〜§4 を参照。本表は独立ルートの画面のみを列挙する。

---

## 2. 機能別画面一覧

### 2.1 AUTH — 認証・ユーザー管理

| 画面 ID | 画面名 | パス | ページコンポーネント | ガード / 備考 |
|---------|--------|------|----------------------|---------------|
| AUTH-01 | ログイン | `/login` | `LoginPage.jsx` | 公開 |
| AUTH-02 | アカウントセキュリティ | `/account/security` | `AccountSecurityPage.jsx` | ログイン済み（自己 MFA 設定） |
| AUTH-03 | ユーザー管理 | `/users` | `UserManagementPage.jsx` | `AdminProtectedRoute` |
| AUTH-04 | 監査ログ | `/admin/audit-logs` | `AuditLogPage.jsx` | `AdminProtectedRoute` |
| AUTH-05 | マスタ一括登録 | `/admin/master-import` | `MasterImportPage.jsx` | `AdminProtectedRoute`。社員（基本情報＋保有資格・関連技術・職務経歴）・取引先の Excel 一括登録。dryRun プレビュー後に本登録 |

---

### 2.2 EMPLOYEE — 社員管理

| 画面 ID | 画面名 | パス | ページコンポーネント | ガード / 備考 |
|---------|--------|------|----------------------|---------------|
| EMP-01 | 社員一覧 | `/` | `EmployeeListPage.jsx` | `ProtectedRoute`。トップ＝一覧 |
| EMP-02 | 社員詳細 | `/employees/:id` | `EmployeeDetailPage.jsx` | ログイン済み。複数タブ構成（`DETAIL_TABS`） |
| EMP-03 | 社員登録 | `/employees/new` | `EmployeeFormPage.jsx`（create） | `WriteProtectedRoute` |
| EMP-04 | 社員編集 | `/employees/:id/edit` | `EmployeeFormPage.jsx`（edit） | `WriteProtectedRoute`。所属部門・役職・役割は ADMIN/HR のみ編集可（`canChangeEmployeeDepartmentAndRole`） |

**詳細の主なタブ（同一ルート EMP-02、順）：** 基本情報 / 案件・配属 / スキル・資格・経歴 / 勤怠・評価・メモ / 総合評価 / 給与・人事（`frontend/src/components/detail/`、`DETAIL_TABS`）。

---

### 2.3 PROJECT — 案件・選考

| 画面 ID | 画面名 | パス | ページコンポーネント | ガード / 備考 |
|---------|--------|------|----------------------|---------------|
| PRJ-01 | 案件マッチング | `/project-match` | `ProjectMatchPage.jsx` | `ProjectFeatureProtectedRoute` |
| PRJ-02 | 案件一覧 | `/projects` | `ProjectListPage.jsx` | `ProjectFeatureProtectedRoute` |
| PRJ-03 | 案件詳細 | `/projects/:id` | `ProjectDetailPage.jsx` | 同上。候補・選考・配属・BP求援・臨時候補 |
| PRJ-04 | 案件登録 | `/projects/new` | `ProjectFormPage.jsx`（create） | `ProjectWriteProtectedRoute` |
| PRJ-05 | 案件編集 | `/projects/:id/edit` | `ProjectFormPage.jsx`（edit） | `ProjectWriteProtectedRoute` |
| PRJ-06 | BP求援一覧 | `/bp-help-requests` | `BpHelpRequestsPage.jsx` | `ProjectFeatureProtectedRoute`。サイドバー件数バッジ |

共通コンポーネント（独立ルートではない）：ヘッダー **通知ベル**（`NotificationBell.jsx`、未読ポーリング）。

---

### 2.4 EMPLOYEE_STATUS — 社員状態・配属フォロー

| 画面 ID | 画面名 | パス | ページコンポーネント | ガード / 備考 |
|---------|--------|------|----------------------|---------------|
| STS-01 | 社員状態提案 | `/employee-status/suggestions` | `EmployeeStatusSuggestionsPage.jsx` | `ProjectWriteProtectedRoute` |
| STS-02 | 配属取消フォロー | `/assignment-cancel-followups` | `AssignmentCancelFollowupsPage.jsx` | `ProjectWriteProtectedRoute` |

---

### 2.5 CLIENT — 取引先管理

| 画面 ID | 画面名 | パス | ページコンポーネント | ガード / 備考 |
|---------|--------|------|----------------------|---------------|
| CLT-01 | 取引先一覧 | `/clients` | `ClientListPage.jsx` | `ClientEventProtectedRoute` |
| CLT-02 | 取引先詳細 | `/clients/:id` | `ClientDetailPage.jsx` | 同上 |
| CLT-03 | 取引先登録 | `/clients/new` | `ClientFormPage.jsx`（create） | `ClientEventProtectedRoute` + `ClientWriteProtectedRoute` |
| CLT-04 | 取引先編集 | `/clients/:id/edit` | `ClientFormPage.jsx`（edit） | 同上 |

---

### 2.6 CLIENT_CRM — 顧客活動・議事録

| 画面 ID | 画面名 | パス | ページコンポーネント | ガード / 備考 |
|---------|--------|------|----------------------|---------------|
| CRM-01 | 顧客活動一覧 | `/client-events` | `ClientEventPage.jsx` | `ClientEventProtectedRoute` |
| CRM-02 | 顧客活動登録 | `/client-events/new` | `ClientEventFormPage.jsx`（create） | + `ClientWriteProtectedRoute` |
| CRM-03 | 顧客活動編集 | `/client-events/:id/edit` | `ClientEventFormPage.jsx`（edit） | + `ClientWriteProtectedRoute` |
| CRM-04 | 議事録・課題 | `/client-records` | `ClientRecordPage.jsx` | `ClientRecordProtectedRoute` |
| CRM-05 | 議事録登録 | `/client-records/new` | `ClientRecordFormPage.jsx`（create） | 同上 |
| CRM-06 | 議事録編集 | `/client-records/:id/edit` | `ClientRecordFormPage.jsx`（edit） | 同上 |

> 会議室予約は機能 **MEETING_ROOM**（§2.9）として独立。本ドメインには含めない。

---

### 2.7 FILE — ファイル管理

| 画面 ID | 画面名 | パス | ページコンポーネント | ガード / 備考 |
|---------|--------|------|----------------------|---------------|
| FIL-01 | ファイル管理 | `/files` | `FileManagementPage.jsx` | ログイン済み。書込は画面内の権限制御 |

関連ファイルの状態は社員詳細の勤怠タブにも表示される場合がある（独立ルートではない）。

---

### 2.8 HR_OPS — 人事業務

| 画面 ID | 画面名 | パス | ページコンポーネント | ガード / 備考 |
|---------|--------|------|----------------------|---------------|
| HR-01 | 人事業務ハブ | `/hr-ops` | `HrOpsHubPage.jsx` | `HrOpsProtectedRoute`（`canManageHrOps`：ADMIN/HR） |
| HR-02 | 証明書発行 | `/hr-ops/certificate` | `HrOpsCertificatePage.jsx` | 同上 |
| HR-03 | 申請書 | `/hr-ops/application` | `HrOpsApplicationPage.jsx` | 同上 |
| HR-04 | 申請審査 | `/hr-ops/application-review` | `HrOpsApplicationReviewPage.jsx` | 同上 |
| HR-05 | 給与明細 | `/hr-ops/payroll` | `HrOpsPayrollPage.jsx` | 同上 |
| HR-06 | 取引先送付 | `/hr-ops/client-send` | `HrOpsClientSendPage.jsx` | 同上 |
| HR-07 | 入社（プレースホルダ） | `/hr-ops/onboarding` | `HrOpsPlaceholderPage.jsx` | 未実装 |
| HR-08 | 退社（プレースホルダ） | `/hr-ops/offboarding` | `HrOpsPlaceholderPage.jsx` | 未実装 |
| HR-09 | その他（プレースホルダ） | `/hr-ops/other` | `HrOpsPlaceholderPage.jsx` | 未実装 |

---

### 2.9 MEETING_ROOM — 会議室予約

独立機能（顧客活動・議事録から分離）。ルート `/meeting-rooms`。権限は `auth.js` の `canViewMeetingRooms` / `canWriteMeetingRoomReservations` / `canManageMeetingRooms` / `canModifyMeetingRoomReservation`。

| 画面 ID | 画面名 | パス / 形態 | ページ・コンポーネント | ガード / 備考 |
|---------|--------|-------------|------------------------|---------------|
| MR-01 | 会議室カレンダー | `/meeting-rooms`（ページ） | `MeetingRoomCalendarPage.jsx` | ログイン済み。週グリッドで予約表示。会議室・週を切替 |
| MR-02 | 予約登録/編集 | モーダル（MR-01 上） | `MeetingRoomReservationModal.jsx` | ログインユーザーが新規可。**本人または ADMIN** が編集・取消可 |
| MR-03 | 会議室設定 | モーダル（MR-01 上） | `MeetingRoomSettingsModal.jsx` | **ADMIN のみ**（`canManageMeetingRooms`）。設備・時間帯などを編集 |
| MR-04 | 会議室登録 | モーダル（MR-01 上） | `MeetingRoomCreateModal.jsx` | **ADMIN のみ**。会議室マスタの新規 |

**主な操作（MR-01）：**

| 操作 | 説明 |
|------|------|
| 会議室選択 | `/api/meeting-rooms` を取得し、カレンダー対象を切替 |
| 週切替 | 月曜始まりの週グリッド。セルクリックで予約作成 |
| 予約 CRUD | `/api/meeting-room-reservations` の作成・更新・取消（DELETE） |
| マスタ管理 | ADMIN：登録・設定変更・削除 `/api/meeting-rooms` |

**実装参照：**

| 分類 | パス |
|------|------|
| ページ | `frontend/src/pages/MeetingRoomCalendarPage.jsx` |
| コンポーネント | `frontend/src/components/meetingRoom/*` |
| カレンダーユーティリティ | `frontend/src/utils/meetingRoomCalendar.js` |
| API クライアント | `frontend/src/api.js`（`getMeetingRooms` 等） |
| バックエンド | `MeetingRoomController`、`MeetingRoomReservationController` |

基本設計の詳細は [09-会議室予約](../basic-design/09-会議室予約.md) を参照。

---

## 3. ルート総表（パス順）

| パス | 画面名 | 機能 |
|------|--------|------|
| `/` | 社員一覧 | EMPLOYEE |
| `/login` | ログイン | AUTH |
| `/account/security` | アカウントセキュリティ | AUTH |
| `/admin/audit-logs` | 監査ログ | AUTH |
| `/assignment-cancel-followups` | 配属取消フォロー | EMPLOYEE_STATUS |
| `/bp-help-requests` | BP求援一覧 | PROJECT |
| `/client-events` | 顧客活動一覧 | CLIENT_CRM |
| `/client-events/new` | 顧客活動登録 | CLIENT_CRM |
| `/client-events/:id/edit` | 顧客活動編集 | CLIENT_CRM |
| `/client-records` | 議事録・課題 | CLIENT_CRM |
| `/client-records/new` | 議事録登録 | CLIENT_CRM |
| `/client-records/:id/edit` | 議事録編集 | CLIENT_CRM |
| `/clients` | 取引先一覧 | CLIENT |
| `/clients/new` | 取引先登録 | CLIENT |
| `/clients/:id` | 取引先詳細 | CLIENT |
| `/clients/:id/edit` | 取引先編集 | CLIENT |
| `/employee-status/suggestions` | 社員状態提案 | EMPLOYEE_STATUS |
| `/employees/new` | 社員登録 | EMPLOYEE |
| `/employees/:id` | 社員詳細 | EMPLOYEE |
| `/employees/:id/edit` | 社員編集 | EMPLOYEE |
| `/files` | ファイル管理 | FILE |
| `/hr-ops` | 人事業務ハブ | HR_OPS |
| `/hr-ops/application` | 申請書 | HR_OPS |
| `/hr-ops/application-review` | 申請審査 | HR_OPS |
| `/hr-ops/certificate` | 証明書発行 | HR_OPS |
| `/hr-ops/client-send` | 取引先送付 | HR_OPS |
| `/hr-ops/offboarding` | 退社（プレースホルダ） | HR_OPS |
| `/hr-ops/onboarding` | 入社（プレースホルダ） | HR_OPS |
| `/hr-ops/other` | その他（プレースホルダ） | HR_OPS |
| `/hr-ops/payroll` | 給与明細 | HR_OPS |
| `/meeting-rooms` | 会議室カレンダー | MEETING_ROOM |
| `/project-match` | 案件マッチング | PROJECT |
| `/projects` | 案件一覧 | PROJECT |
| `/projects/new` | 案件登録 | PROJECT |
| `/projects/:id` | 案件詳細 | PROJECT |
| `/projects/:id/edit` | 案件編集 | PROJECT |
| `/users` | ユーザー管理 | AUTH |

---

## 4. 保守ルール

| 変更の種類 | 本ファイルの更新 | あわせて更新するもの |
|------------|------------------|----------------------|
| ルート画面の追加・削除 | §1〜§3 | 対応する `basic-design/0x-*.md` の画面一覧 |
| 項目レイアウトのみの変更 | 必須ではない | 基本設計の「画面詳細」または詳細設計 |
| メニュー名の変更 | §2 の画面名 | 操作マニュアルのサイドバー説明 |

ルート定義の正：`frontend/src/App.jsx`。

---

*バージョン 1.4（2026-08-12）：マスタ一括登録の多シート取込、社員編集時の役職権限制限を反映。*

*バージョン 1.3（2026-08-06）：BP求援一覧（PRJ-06）と通知ベルを追加。*

*バージョン 1.2：MEETING_ROOM 基本設計リンクを追加し、基本設計と整合済みの旧パス注記を削除。文書本文は日本語のみ。*
