-- 個人情報：履歴書「備考」を保存
ALTER TABLE employee_personal
    ADD COLUMN IF NOT EXISTS remarks TEXT;
