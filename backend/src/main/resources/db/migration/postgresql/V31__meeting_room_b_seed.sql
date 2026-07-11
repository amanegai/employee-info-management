-- 会議室B を追加
INSERT INTO meeting_room (
    name, floor, capacity, equipment, slot_minutes, business_start, business_end,
    is_active, sort_order, created_at, updated_at
)
SELECT
    '会議室B',
    NULL,
    6,
    'テレビモニター, ホワイトボード',
    30,
    '09:00',
    '22:00',
    TRUE,
    1,
    to_char(NOW() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD"T"HH24:MI:SS'),
    to_char(NOW() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD"T"HH24:MI:SS')
WHERE NOT EXISTS (SELECT 1 FROM meeting_room WHERE name = '会議室B');
