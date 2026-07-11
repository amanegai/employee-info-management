ALTER TABLE employee_attendance
    ADD COLUMN IF NOT EXISTS work_days NUMERIC(5, 1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS work_hours NUMERIC(7, 1) NOT NULL DEFAULT 0;

-- 給与明細サンプル社員：周凱（PDF 202603008 準拠）
INSERT INTO employee (employee_code, name, department_id, position, employee_type, work_status, unit_price, evaluation, end_date)
VALUES ('E2008', '周凱', 2, '', '正社員', '稼働中', 650000, 'B3', NULL)
ON CONFLICT (employee_code) DO NOTHING;

DO $$
DECLARE
    emp_id BIGINT;
    period_text TEXT;
BEGIN
    SELECT id INTO emp_id FROM employee WHERE employee_code = 'E2008';
    IF emp_id IS NULL THEN
        RETURN;
    END IF;

    period_text := to_char(CURRENT_DATE, 'YYYY') || '年' || extract(month FROM CURRENT_DATE)::int || '月';

    INSERT INTO employee_personal (
        employee_id, gender, birth_date, nationality, phone, email, address, education, nearest_station,
        furigana, marital_status, it_industry_years, japan_arrival_date, education_degree, school_name, major,
        japanese_level, japanese_conversation, japanese_reading, japanese_writing,
        english_level, english_conversation, english_reading, english_writing,
        technical_level, specialty_dev, specialty_business, self_pr
    ) VALUES (
        emp_id, '男性', '1992-08-15', '中国', '080-5555-2008', 'zhou.kai@bit-cross.example.jp',
        '東京都品川区西五反田2-1-1', '上海交通大学 情報工学部', '五反田駅（徒歩8分）',
        'シュウ カイ', '既婚', 8, '2018-04-01', '学士', '上海交通大学', 'ソフトウェア工学',
        'B', '◎', '◎', '△',
        'B', '◎', '◎', '△',
        '〇', 'Java / Spring を中心とした業務系開発', 'SI・派遣開発',
        '開発経験8年。品質意識が高く、チーム内のコミュニケーションも良好。'
    )
    ON CONFLICT (employee_id) DO NOTHING;

    INSERT INTO employee_skill (employee_id, skill_name, level, experience_years, sort_order)
    SELECT emp_id, skill_name, level, experience_years, sort_order
    FROM (VALUES
        ('Java', 5, 8, 1),
        ('Spring', 4, 6, 2),
        ('SQL', 4, 7, 3),
        ('JavaScript', 3, 4, 4)
    ) AS v(skill_name, level, experience_years, sort_order)
    WHERE NOT EXISTS (SELECT 1 FROM employee_skill WHERE employee_id = emp_id);

    INSERT INTO employee_qualification (employee_id, description, sort_order)
    SELECT emp_id, description, sort_order
    FROM (VALUES
        ('基本情報技術者（2016年 取得）', 1),
        ('JLPT N2（2020年 取得）', 2)
    ) AS v(description, sort_order)
    WHERE NOT EXISTS (SELECT 1 FROM employee_qualification WHERE employee_id = emp_id);

    INSERT INTO employee_technical_skill (employee_id, category, item_name, level, sort_order)
    SELECT emp_id, category, item_name, level, sort_order
    FROM (VALUES
        ('OS', 'Linux', '〇', 1),
        ('OS', 'Windows', '◎', 2),
        ('開発言語', 'Java', '◎', 3),
        ('DB', 'PostgreSQL', '〇', 4),
        ('DB', 'Oracle', '△', 5),
        ('フレームワーク/ソリューション', 'Spring', '◎', 6)
    ) AS v(category, item_name, level, sort_order)
    WHERE NOT EXISTS (SELECT 1 FROM employee_technical_skill WHERE employee_id = emp_id);

    INSERT INTO employee_career (
        employee_id, period, organization, role_overview, sort_order,
        start_date, end_date, workplace, role, os_db, languages, fw_tools, phases
    )
    SELECT
        emp_id, '2022/04～現在', 'ビットクロス株式会社／開発一部', '金融系システムの詳細設計・製造を担当。', 1,
        '2022-04-01', NULL, '東京', 'SE', E'Linux\nPostgreSQL', E'Java\nSQL', E'Spring\nGit', '詳細設計,製造,単体テスト'
    WHERE NOT EXISTS (SELECT 1 FROM employee_career WHERE employee_id = emp_id);

    INSERT INTO employee_attendance (
        employee_id, attendance_rate, late_early_count, paid_leave_remaining, period_label, work_days, work_hours
    ) VALUES (
        emp_id, 100, 0, 12, period_text, 21, 140.5
    )
    ON CONFLICT (employee_id) DO UPDATE SET
        attendance_rate = EXCLUDED.attendance_rate,
        late_early_count = EXCLUDED.late_early_count,
        paid_leave_remaining = EXCLUDED.paid_leave_remaining,
        period_label = EXCLUDED.period_label,
        work_days = EXCLUDED.work_days,
        work_hours = EXCLUDED.work_hours;

    INSERT INTO employee_evaluation_history (employee_id, year_label, status_text, next_evaluation_note) VALUES
        (emp_id, '2026年度', '定期評価対象', '次回評価：2026年10月予定')
    ON CONFLICT (employee_id) DO NOTHING;

    INSERT INTO employee_memo (employee_id, content) VALUES
        (emp_id, '2026年3月給与明細サンプルデータ。開発一部所属。')
    ON CONFLICT (employee_id) DO NOTHING;

    INSERT INTO employee_salary (
        employee_id, basic_salary_monthly, commuter_allowance, annual_salary, bonus, overtime_rate, payment_day, billing_unit_price,
        housing_allowance, family_allowance, fixed_overtime_allowance,
        deduction_health_care, deduction_health, deduction_pension, deduction_employment, deduction_income_tax, deduction_resident_tax
    ) VALUES (
        emp_id, 352000, 11520, 6978240, 600000, 2200, '25日', 650000,
        60000, 80000, 78000,
        5310, 28025, 53985, 3198, 9340, 16700
    )
    ON CONFLICT (employee_id) DO UPDATE SET
        basic_salary_monthly = EXCLUDED.basic_salary_monthly,
        commuter_allowance = EXCLUDED.commuter_allowance,
        annual_salary = EXCLUDED.annual_salary,
        bonus = EXCLUDED.bonus,
        overtime_rate = EXCLUDED.overtime_rate,
        payment_day = EXCLUDED.payment_day,
        billing_unit_price = EXCLUDED.billing_unit_price,
        housing_allowance = EXCLUDED.housing_allowance,
        family_allowance = EXCLUDED.family_allowance,
        fixed_overtime_allowance = EXCLUDED.fixed_overtime_allowance,
        deduction_health_care = EXCLUDED.deduction_health_care,
        deduction_health = EXCLUDED.deduction_health,
        deduction_pension = EXCLUDED.deduction_pension,
        deduction_employment = EXCLUDED.deduction_employment,
        deduction_income_tax = EXCLUDED.deduction_income_tax,
        deduction_resident_tax = EXCLUDED.deduction_resident_tax;

    INSERT INTO employee_hr (
        employee_id, hire_date, contract_start_date, contract_end_date,
        social_insurance_status, employment_insurance_no, pension_no,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation, paid_leave_start_date
    ) VALUES (
        emp_id, '2022-04-01', '2022-04-01', NULL,
        '加入', '2008-123456-7', '2008123456',
        '周 美玲', '080-9999-2008', '配偶者', '2022-04-01'
    )
    ON CONFLICT (employee_id) DO NOTHING;

    INSERT INTO employee_overall_evaluation (
        employee_id, overall_rank, rank_label, continuation_text, evaluation_date, evaluator_name, evaluator_department, overall_comment
    ) VALUES (
        emp_id, 'B', '（必要十分）', '継続可', '2026-01-15', '山田 太郎（部長）', '事業一部・開発一部',
        '安定した成果を継続。コミュニケーション面も良好。'
    )
    ON CONFLICT (employee_id) DO NOTHING;
END $$;
