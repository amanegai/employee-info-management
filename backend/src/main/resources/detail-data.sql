-- 社員ID=1（E001）の詳細サンプル（画面モック準拠）
INSERT OR IGNORE INTO employee_personal (
  employee_id, gender, birth_date, nationality, phone, email, address, education, nearest_station, photo_url,
  furigana, marital_status, it_industry_years, japan_arrival_date, education_degree, school_name, major,
  japanese_level, japanese_reading, japanese_writing, english_level, english_reading, english_writing,
  technical_level, specialty_dev, specialty_business, self_pr
) VALUES
(1, '男性', '1995-05-20', '中国', '080-1234-5678', 'yamada.taro@example.com',
 '東京都渋谷区桜丘町10-5 サクラビル2F', '早稲田大学 理工学部', '渋谷駅（徒歩5分）', NULL,
 'ヤマダ タロウ', '未婚', 5, '2020-04-01', '学士', '早稲田大学', 'コンピュータサイエンス',
 'B', '◎', '△', 'D', '△', '△', '〇',
 'Python/AWSを中心としたWeb系開発', '金融・SaaS', '入社初年度ながら社内AIプロジェクトで積極的に貢献。技術吸収力が高く、周囲との協調性も良好。');

INSERT OR IGNORE INTO employee_skill (employee_id, skill_name, level, experience_years, sort_order) VALUES
(1, 'Python', 5, 5, 1),
(1, 'AWS', 4, 3, 2),
(1, 'Docker', 3, 2, 3),
(1, 'JavaScript', 4, 4, 4);

INSERT OR IGNORE INTO employee_qualification (employee_id, description, sort_order) VALUES
(1, '情報処理安全確保支援士（2024年5月 取得）', 1),
(1, 'AWS認定ソリューションアーキテクト（2023年10月 取得）', 2),
(1, 'TOEIC 850点（2022年）', 3);

INSERT OR IGNORE INTO employee_technical_skill (employee_id, category, item_name, level, sort_order) VALUES
(1, 'OS', 'Linux', '〇', 1),
(1, 'OS', 'Windows', '◎', 2),
(1, '開発言語', 'Java', '◎', 3),
(1, '開発言語', 'python', '〇', 4),
(1, 'Script言語', 'JavaScript', '◎', 5),
(1, 'DB', 'MySQL', '◎', 6),
(1, 'DB', 'PostgreSQL', '〇', 7),
(1, 'フレームワーク/ソリューション', 'Spring', '◎', 8),
(1, 'その他', 'Amazon AWS', '〇', 9),
(1, '業務知識', '金融業・証券・銀行', '△', 10);

INSERT OR IGNORE INTO employee_career (
  employee_id, period, organization, role_overview, sort_order,
  start_date, end_date, months, workplace, role, os_db, languages, fw_tools, phases
) VALUES
(1, '2023/11～現在', '自社／開発第二部', 'AIプロダクト開発チームに所属し、サーバーサイド開発を担当。', 1,
 '2023-11-01', NULL, NULL, '東京', 'SE', 'Linux\nAWS', 'Python\nJavaScript', 'Docker\nFastAPI', '基本設計,製造,単体テスト'),
(1, '2020/04～2023/10', '〇〇テクノロジー社', '金融系SaaS開発に従事。AWSインフラ設計とPython API実装。', 2,
 '2020-04-01', '2023-10-31', 42, '東京', 'PG', 'Linux\nPostgreSQL', 'Python', 'Docker\nTerraform', '詳細設計,製造,結合テスト');

INSERT OR IGNORE INTO employee_attendance (employee_id, attendance_rate, late_early_count, paid_leave_remaining, period_label) VALUES
(1, 98, 0, 8, '2025年10月');

INSERT OR IGNORE INTO employee_evaluation_history (employee_id, year_label, status_text, next_evaluation_note) VALUES
(1, '2026年度', '初回評価対象', '※ 次回評価時期：2028年4月予定');

INSERT OR IGNORE INTO employee_memo (employee_id, content) VALUES
(1, '入社初年度ながら社内AIプロジェクトで積極的に貢献。技術吸収力が高く、周囲との協調性も良好。');

INSERT OR IGNORE INTO employee_salary (employee_id, basic_salary_monthly, commuter_allowance, annual_salary, bonus, overtime_rate, payment_day, billing_unit_price) VALUES
(1, 350000, 12000, 5600000, 700000, 2500, '25日', 850000);

INSERT OR IGNORE INTO employee_hr (employee_id, hire_date, contract_start_date, contract_end_date, social_insurance_status, employment_insurance_no, pension_no, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, paid_leave_start_date) VALUES
(1, '2023-11-01', '2023-11-01', NULL, '加入', '1234-567890-1', '1234567890', '山田 花子', '090-9876-5432', '配偶者', '2023-11-01');

INSERT OR IGNORE INTO employee_overall_evaluation (employee_id, overall_rank, rank_label, continuation_text, evaluation_date, evaluator_name, evaluator_department, overall_comment) VALUES
(1, 'S', '（卓越した成果）', '継続推奨（延長前提）', '2025-01-10', '山田 一郎（PM）',
 'NTTデータ ソリューション事業部 第一開発部',
 '技術力・コミュニケーションともに高水準。今後はリーダー候補として育成を推奨。');

-- 評価項目（category_code: BASIC, TECH, COMM, PROJECT, COMPLIANCE, CUSTOMER）
INSERT OR IGNORE INTO employee_evaluation_item (employee_id, category_code, item_name, rank_grade, comment, sort_order) VALUES
(1, 'BASIC', '業務理解力', 'A', '新規業務でもキャッチアップが早く、要件の意図を正確に把握している。', 1),
(1, 'BASIC', '論理的思考力', 'A', '問題整理・説明が明確で、レビュー時の指摘も論理的。', 2),
(1, 'BASIC', '問題発見力', 'B', '仕様漏れに気づくこともあるが、テスト設計視点の強化が今後の課題。', 3),
(1, 'BASIC', '作業スピード', 'S', '工数見積に対して余裕を持って完了できる。', 4),
(1, 'BASIC', '正確性', 'A', 'ケアレスミスが極めて少なく、品質が安定している。', 5),
(1, 'TECH', '設計力（基本設計）', 'A', '業務フロー・画面設計の粒度が適切で、顧客レビューもスムーズ。', 1),
(1, 'TECH', '設計力（詳細設計）', 'B', 'クラス・IF設計は十分。再利用性の観点向上に期待。', 2),
(1, 'TECH', '実装スキル', 'A', 'コーディングが安定。レビュー修正が少ない。', 3),
(1, 'TECH', 'テストスキル', 'B', '基本ケースは網羅。境界値・異常系の考慮に余地あり。', 4),
(1, 'TECH', 'インフラ理解', 'B', 'AWS基本サービスを理解。環境構築を独力で実施可能。', 5),
(1, 'TECH', 'セキュリティ意識', 'A', 'ログマスキング・権限設計など実装レベルで配慮。', 6),
(1, 'TECH', 'ドキュメント作成能力', 'B', 'レビュー資料・手順書は読みやすい。図表活用が今後の改善点。', 7),
(1, 'COMM', '報連相', 'A', '報告タイミングが適切で、PMが状況を把握しやすい。', 1),
(1, 'COMM', '社内コミュニケーション', 'B', '情報共有は十分。より能動的な発信に期待。', 2),
(1, 'COMM', '顧客折衝能力', 'A', 'スケジュール調整も冷静。顧客からの信頼が厚い。', 3),
(1, 'COMM', '協調性', 'A', '多様なメンバーと協力し、雰囲気作りに貢献。', 4),
(1, 'COMM', 'チーム貢献度', 'A', '担当外のサポート・レビュー支援も積極的。', 5),
(1, 'PROJECT', '自主性', 'A', '指示待ちではなく、自らタスクを見つけて動ける。', 1),
(1, 'PROJECT', 'タスク遂行能力', 'A', '並行タスクの優先付けが上手で、漏れが少ない。', 2),
(1, 'PROJECT', '進捗管理', 'B', '報告は適切。課題発生時のリスク提示をより早く。', 3),
(1, 'PROJECT', '課題解決力', 'A', '技術課題を自力で調査し、代替案を提示できる。', 4),
(1, 'PROJECT', 'リスク管理', 'B', 'リスク認識はある。早期共有・記録の徹底が必要。', 5),
(1, 'PROJECT', 'リーダーシップ', 'B', 'サブリーダーとしてメンバーをフォロー。今後の成長に期待。', 6),
(1, 'COMPLIANCE', '出勤状況', 'A', '遅刻・欠勤がほぼなく、事前連絡も適切。', 1),
(1, 'COMPLIANCE', '納期遵守', 'A', '遅延がほぼなく、余裕を持って完了することが多い。', 2),
(1, 'COMPLIANCE', 'セキュリティ遵守', 'A', '機密情報の取扱いに注意深く、意識が高い。', 3),
(1, 'COMPLIANCE', '作業報告・記録', 'B', 'JIRA/Redmineへの記録は十分。コメント粒度の向上に期待。', 4),
(1, 'CUSTOMER', '顧客満足度', 'S', '指名での評価あり。継続希望の声が強い。', 1),
(1, 'CUSTOMER', '品質への信頼度', 'A', '成果物への信頼が高く、重大なクレームなし。', 2),
(1, 'CUSTOMER', '顧客との関係性', 'A', '日常コミュニケーションが良好で、相談しやすい。', 3),
(1, 'LEARNING', '新技術の習得意欲', 'A', 'AWS・AI関連などの勉強会に積極的に参加。', 1),
(1, 'LEARNING', '自己研鑽・資格取得', 'A', '情報処理安全確保支援士を取得。', 2),
(1, 'LEARNING', '改善提案・フィードバック反映', 'B', 'レビュー指摘の吸収は早い。提案の幅拡大に期待。', 3);

-- 社員ID=2（E002）の評価項目（簡易）
INSERT OR IGNORE INTO employee_overall_evaluation (employee_id, overall_rank, rank_label, continuation_text, evaluation_date, evaluator_name, evaluator_department, overall_comment) VALUES
(2, 'B', '（必要十分）', '継続可', '2025-01-15', '佐藤 次郎（PL）', '開発第一部', '安定した成果を継続。');

INSERT OR IGNORE INTO employee_evaluation_item (employee_id, category_code, item_name, rank_grade, comment, sort_order) VALUES
(2, 'BASIC', '業務理解力', 'B', '業務理解は十分。', 1),
(2, 'BASIC', '作業スピード', 'B', '標準的なペース。', 2),
(2, 'BASIC', '正確性', 'A', 'ミスが少ない。', 3),
(2, 'TECH', '実装スキル', 'B', 'Java実装が安定。', 1),
(2, 'TECH', 'テストスキル', 'B', '基本ケースは網羅。', 2),
(2, 'COMM', '報連相', 'A', '報告が適切。', 1),
(2, 'COMM', '協調性', 'A', 'チーム調整役として信頼されている。', 2),
(2, 'PROJECT', 'タスク遂行能力', 'B', '担当タスクは確実に完了。', 1),
(2, 'COMPLIANCE', '出勤状況', 'A', '出勤良好。', 1),
(2, 'COMPLIANCE', '納期遵守', 'B', '概ね遵守。', 2),
(2, 'LEARNING', '新技術の習得意欲', 'B', '必要に応じて学習。', 1);

-- 他社員は簡易データ
INSERT OR IGNORE INTO employee_personal (employee_id, gender, birth_date, nationality, phone, email, address, education, nearest_station) VALUES
(2, '女性', '1992-08-15', '日本', '090-1111-2222', 'sato.hanako@example.com', '東京都新宿区', '東京大学', '新宿駅');

INSERT OR IGNORE INTO employee_attendance (employee_id, attendance_rate, late_early_count, paid_leave_remaining, period_label) VALUES
(2, 95, 1, 10, '2025年10月');

INSERT OR IGNORE INTO employee_memo (employee_id, content) VALUES
(2, 'チーム内の調整役として信頼されている。');
