ALTER TABLE file_attachment
    ADD COLUMN IF NOT EXISTS employee_id BIGINT REFERENCES employee(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_file_attachment_employee_id
    ON file_attachment(employee_id)
    WHERE deleted_at IS NULL;
