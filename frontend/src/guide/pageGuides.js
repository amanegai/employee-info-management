/**
 * 画面別オペレーションガイド（営業向けステップツアー）
 * target: CSS セレクタ（data-guide 属性推奨）。null の場合は中央ダイアログ。
 */
export const PAGE_GUIDES = {
  'employee-list': {
    title: '社員一覧',
    steps: [
      {
        title: 'この画面でできること',
        body: '社員の検索・一覧確認・新規登録・履歴書インポートができます。\nまずは上部のサマリーカードで全体像を把握しましょう。',
        target: null,
      },
      {
        title: 'サマリーカード',
        body: '稼働中・待機中・案件終了間近などの人数を表示します。\nカードをクリックすると、その条件で一覧が絞り込まれます。',
        target: '[data-guide="employee-summary"]',
      },
      {
        title: '検索条件',
        body: '氏名・部門・稼働状況・スキルなどで社員を絞り込めます。\n条件を変えると一覧が自動で更新されます。',
        target: '[data-guide="employee-search"]',
      },
      {
        title: '社員一覧',
        body: '行をクリックすると社員詳細へ移動します。\n案件マッチングや配属の確認は詳細の「案件・配属」タブで行います。',
        target: '[data-guide="employee-table"]',
      },
      {
        title: '新規登録',
        body: '編集権限がある場合、「新規社員登録」からマスタを追加できます。',
        target: '[data-guide="employee-create-btn"]',
      },
    ],
  },
  'employee-detail': {
    title: '社員詳細',
    steps: [
      {
        title: '社員詳細の見方',
        body: 'ヘッダーに氏名と稼働状況（バッジ）が表示されます。\n案件終了間近のときは「所属案件終了予定日」も確認してください。',
        target: '[data-guide="employee-detail-summary"]',
      },
      {
        title: 'タブ切り替え',
        body: '基本情報・案件・配属・スキルなどタブで情報が分かれています。\n配属と選考の操作は「案件・配属」タブが中心です。',
        target: '[data-guide="detail-tabs"]',
      },
      {
        title: '案件・配属タブ',
        body: '配属履歴（確定した派工）、選考中案件、選考案件履歴の3つに分かれています。\n選考が終わった案件は履歴に移り、進行中だけが「選考中」に残ります。',
        target: '[data-guide="detail-tab-projects"]',
      },
      {
        title: '操作ボタン',
        body: '履歴書生成・編集・一覧へ戻るなどはここから行います。',
        target: '[data-guide="detail-action-bar"]',
      },
    ],
  },
  'employee-form': {
    title: '社員登録・編集',
    steps: [
      {
        title: '社員マスタの編集',
        body: '基本情報・スキル・給与などをタブごとに入力します。\n保存すると一覧・詳細に反映されます。',
        target: null,
      },
      {
        title: '稼働状況と終了予定日',
        body: '稼働状況が「退職予定」「休業」「案件終了間近」のとき、終了予定日（または復帰予定日）の入力が必要です。',
        target: '[data-guide="employee-form-status"]',
      },
    ],
  },
  'project-match': {
    title: '案件マッチング',
    steps: [
      {
        title: '案件マッチングの流れ',
        body: '①募集中の案件を選ぶ → ②マッチング実行 → ③候補社員を確認 → ④案件詳細で選考進行、が基本です。',
        target: null,
      },
      {
        title: '案件一覧',
        body: '募集中・一部確定の案件だけマッチングできます。\n行をクリックすると案件詳細へ、右の「マッチング」で候補検索を開始します。',
        target: '[data-guide="project-match-list"]',
      },
      {
        title: 'マッチング結果',
        body: 'スコア順に社員が表示されます。候補を案件に追加し、案件詳細で顧客提案済・選考中へ進めます。',
        target: '[data-guide="project-match-results"]',
      },
    ],
  },
  'project-list': {
    title: '案件管理',
    steps: [
      {
        title: '案件一覧',
        body: '派遣案件の募集状況・人数・期間を一覧で確認できます。',
        target: null,
      },
      {
        title: 'ステータスと操作',
        body: '募集中・一部確定・満員などでフィルタできます。行から詳細へ進み、候補者・採用確定を行います。',
        target: '[data-guide="project-list-table"]',
      },
    ],
  },
  'project-detail': {
    title: '案件詳細',
    steps: [
      {
        title: '案件詳細',
        body: '案件内容・必要スキル・確定人数を確認します。候補者がいない場合は案件マッチングから追加してください。',
        target: null,
      },
      {
        title: '候補者と選考',
        body: 'マッチング済→顧客提案済→選考中→採用確定の順に進めます。\n採用確定時は配属開始日・終了日を入力し、配属（PLANNED）が作成されます。',
        target: '[data-guide="project-candidates"]',
      },
      {
        title: '案件マッチングへ',
        body: '追加候補が必要なときはこちらからマッチング画面へ移動できます。',
        target: '[data-guide="project-match-link"]',
      },
    ],
  },
  'project-form': {
    title: '案件登録・編集',
    steps: [
      {
        title: '案件の登録',
        body: '取引先・案件名・スキル・人数・想定開始終了日を入力します。\n終了予定日は案件自体の予定であり、社員配属の終了日とは別です。',
        target: null,
      },
    ],
  },
  'status-suggestions': {
    title: '状態変更提案',
    steps: [
      {
        title: '毎日確認する画面',
        body: 'システムが提案する社員状態変更（稼働中↔案件終了間近↔待機中など）を一覧します。\n未処理はここで「適用」または「無視」してください。',
        target: null,
      },
      {
        title: '提案カード',
        body: '社員名・現在の状態→おすすめの状態・理由（わかりやすい説明）が表示されます。\n内容が正しければ「適用」、誤りや保留なら「無視」を選びます。',
        target: '[data-guide="status-suggestion-list"]',
      },
      {
        title: 'メンテナンス実行',
        body: '管理者のみ：手動で日次ルールを実行し、提案を生成できます（通常は深夜の自動実行）。',
        target: '[data-guide="status-suggestion-maint"]',
      },
    ],
  },
  'assignment-cancel-followups': {
    title: '配属取消フォロー',
    steps: [
      {
        title: '配属取消後のフォロー',
        body: '配属を取消したあと、再提案・マッチングが必要か確認するタスク一覧です。\nLOST になった他案件選考は自動では戻りません。',
        target: null,
      },
      {
        title: '未完了タスク',
        body: '確認が終わったら完了に更新し、必要に応じて案件マッチングへ進んでください。',
        target: '[data-guide="cancel-followup-list"]',
      },
    ],
  },
  'file-management': {
    title: 'ファイル管理',
    steps: [
      {
        title: 'ファイル管理',
        body: '社員・案件関連のファイルをアップロード・分類・ダウンロードできます。',
        target: null,
      },
      {
        title: 'アップロード',
        body: 'ドラッグ＆ドロップまたはファイル選択で追加します。カテゴリを選んで整理してください。',
        target: '[data-guide="file-upload"]',
      },
    ],
  },
  'client-list': {
    title: '取引先管理',
    steps: [
      {
        title: '取引先一覧',
        body: '取引先マスタの検索・登録・詳細確認ができます。',
        target: null,
      },
      {
        title: '取引先テーブル',
        body: '行から詳細・編集へ進み、イベントや議事録と連携します。',
        target: '[data-guide="client-list-table"]',
      },
    ],
  },
  'client-detail': {
    title: '取引先詳細',
    steps: [
      {
        title: '取引先詳細',
        body: '基本情報・契約・担当者などを確認します。編集は画面右上から行います。',
        target: null,
      },
    ],
  },
  'client-form': {
    title: '取引先登録・編集',
    steps: [
      {
        title: '取引先の登録',
        body: '取引先名・ランク・契約情報を入力します。自社担当者は社員カード（営業部・代理部長以上）から選べます。同じ社員は複数担当に重複して選べません。',
        target: null,
      },
    ],
  },
  'client-events': {
    title: 'イベント参加',
    steps: [
      {
        title: 'イベント参加管理',
        body: '取引先イベントへの参加予定・出席者を管理します。',
        target: null,
      },
      {
        title: 'イベント一覧',
        body: '新規作成・編集・参加者の追加は一覧とフォームから行います。',
        target: '[data-guide="client-event-list"]',
      },
    ],
  },
  'client-event-form': {
    title: 'イベント登録・編集',
    steps: [
      {
        title: 'イベントの登録',
        body: '日時・場所・参加者（営業部またはリーダー以上）を設定して保存します。',
        target: null,
      },
    ],
  },
  'client-records': {
    title: '議事録・タスク',
    steps: [
      {
        title: '議事録・タスク',
        body: '取引先との議事録とフォロータスクを記録・追跡します。',
        target: null,
      },
      {
        title: '一覧',
        body: '新規作成で議事録を追加し、タスクの完了状況を更新できます。',
        target: '[data-guide="client-record-list"]',
      },
    ],
  },
  'client-record-form': {
    title: '議事録登録・編集',
    steps: [
      {
        title: '議事録の登録',
        body: '日付・参加者・内容・関連タスクを入力します。参加者は3列表示で選びやすくなっています。',
        target: null,
      },
    ],
  },
  'hr-ops-hub': {
    title: '人事業務管理',
    steps: [
      {
        title: '人事業務ハブ',
        body: '証明書・申請・給与・送付など人事関連業務への入口です。カードを選んで各業務画面へ進みます。',
        target: '[data-guide="hr-ops-hub-cards"]',
      },
    ],
  },
  'hr-ops-certificate': {
    title: '証明書発行',
    steps: [
      {
        title: '証明書発行',
        body: '社員を選び、証明書の種類と記載内容を入力してプレビュー・PDF出力します。',
        target: null,
      },
    ],
  },
  'hr-ops-application': {
    title: '申請書類',
    steps: [
      {
        title: '申請書類',
        body: '社員の各種申請書類を作成・管理します。テンプレートに沿って入力してください。',
        target: null,
      },
    ],
  },
  'hr-ops-application-review': {
    title: '申請審査',
    steps: [
      {
        title: '申請審査',
        body: '提出された申請の確認・承認・差戻しを行います。',
        target: null,
      },
    ],
  },
  'hr-ops-payroll': {
    title: '給与関連',
    steps: [
      {
        title: '給与関連',
        body: '給与明細などの人事オペレーションを行う画面です。',
        target: null,
      },
    ],
  },
  'hr-ops-client-send': {
    title: '顧客送付',
    steps: [
      {
        title: '顧客送付',
        body: '取引先へ送付する書類の準備・記録を行います。',
        target: null,
      },
    ],
  },
  'hr-ops-placeholder': {
    title: '人事業務（準備中）',
    steps: [
      {
        title: '準備中の業務',
        body: 'この業務は現在準備中です。利用可能になったらカードからアクセスできます。',
        target: null,
      },
    ],
  },
  'account-security': {
    title: 'セキュリティ設定',
    steps: [
      {
        title: 'アカウントセキュリティ',
        body: 'パスワード変更・二要素認証（TOTP）の設定ができます。',
        target: null,
      },
    ],
  },
  'user-management': {
    title: 'ユーザー管理',
    steps: [
      {
        title: 'ユーザー管理',
        body: 'ログインユーザーの追加・権限・ロールを管理します（管理者向け）。',
        target: null,
      },
    ],
  },
  'audit-log': {
    title: '操作監査ログ',
    steps: [
      {
        title: '監査ログ',
        body: 'ログイン・権限変更・採用確定・状態提案の適用など重要操作の履歴を確認できます。',
        target: null,
      },
    ],
  },
  'meeting-room-calendar': {
    title: '会議室予約',
    steps: [
      {
        title: '週間カレンダー',
        body: '会議室の空き状況を週単位で確認できます。前週・今週・翌週ボタンで表示期間を切り替えます。',
        target: '[data-guide="meeting-room-week"]',
      },
      {
        title: '予約の作成',
        body: '空き枠をクリックすると予約ダイアログが開きます。件名・日時・時間（15/30/60分単位）を指定して即時予約できます。',
        target: '[data-guide="meeting-room-calendar"]',
      },
      {
        title: '会議室設定',
        body: '管理者は「会議室設定」から名称・定員・予約時間枠（15/30/60分）・利用時間帯を変更できます。',
        target: null,
      },
    ],
  },
};
