-- 満員案件の終了確認リマインド（担当者通知）
ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS filled_reached_at TEXT;

ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS filled_close_remind_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE dispatch_project
    ADD COLUMN IF NOT EXISTS filled_close_next_at TEXT;

CREATE INDEX IF NOT EXISTS idx_dispatch_project_filled_close_remind
    ON dispatch_project (filled_close_next_at)
    WHERE status = 'FILLED' AND filled_close_next_at IS NOT NULL;

-- 既存の満員案件：次回バッチで初回通知候補にする（約1日後）
UPDATE dispatch_project
SET filled_reached_at = COALESCE(NULLIF(TRIM(filled_reached_at), ''), updated_at,
                                 to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')),
    filled_close_remind_count = 0,
    filled_close_next_at = to_char(CURRENT_TIMESTAMP + INTERVAL '1 day', 'YYYY-MM-DD"T"HH24:MI:SS')
WHERE status = 'FILLED'
  AND (filled_close_next_at IS NULL OR TRIM(filled_close_next_at) = '');
