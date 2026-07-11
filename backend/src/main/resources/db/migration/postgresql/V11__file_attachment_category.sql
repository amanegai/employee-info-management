ALTER TABLE file_attachment
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS target_month TEXT;

COMMENT ON COLUMN file_attachment.category IS 'ファイル分類コード（TIMESHEET 等）';
COMMENT ON COLUMN file_attachment.target_month IS '対象年月（YYYY-MM）';

CREATE INDEX IF NOT EXISTS idx_file_attachment_category ON file_attachment(category)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_file_attachment_target_month ON file_attachment(target_month)
    WHERE deleted_at IS NULL;
