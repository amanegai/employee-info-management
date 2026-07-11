ALTER TABLE employee_attendance
    ADD COLUMN IF NOT EXISTS target_month VARCHAR(7);

UPDATE employee_attendance
SET target_month = CONCAT(
        SUBSTRING(period_label FROM '^(\d{4})'),
        '-',
        LPAD(SUBSTRING(period_label FROM '年(\d{1,2})月'), 2, '0')
    )
WHERE (target_month IS NULL OR target_month = '')
  AND period_label ~ '^\d{4}年\d{1,2}月';

UPDATE employee_attendance
SET target_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
WHERE target_month IS NULL OR target_month = '';

ALTER TABLE employee_attendance
    ALTER COLUMN target_month SET NOT NULL;

ALTER TABLE employee_attendance DROP CONSTRAINT IF EXISTS employee_attendance_pkey;

ALTER TABLE employee_attendance
    ADD PRIMARY KEY (employee_id, target_month);

CREATE INDEX IF NOT EXISTS idx_employee_attendance_target_month
    ON employee_attendance(target_month DESC);
