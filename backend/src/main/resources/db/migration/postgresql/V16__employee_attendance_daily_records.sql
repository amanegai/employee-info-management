ALTER TABLE employee_attendance
    ADD COLUMN IF NOT EXISTS daily_records JSONB NOT NULL DEFAULT '[]'::jsonb;
