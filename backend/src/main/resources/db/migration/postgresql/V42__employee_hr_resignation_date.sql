-- 退社日（入社日と対になる人事マスタ項目）
ALTER TABLE employee_hr
    ADD COLUMN IF NOT EXISTS resignation_date TEXT;
