ALTER TABLE file_attachment RENAME COLUMN stored_name TO storage_path;

COMMENT ON COLUMN file_attachment.storage_path IS 'ファイルの保存先絶対パス';
