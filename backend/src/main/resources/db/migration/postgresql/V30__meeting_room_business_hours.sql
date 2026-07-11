-- 会議室の利用時間を 9:00〜22:00 に統一
UPDATE meeting_room
SET business_start = '09:00',
    business_end = '22:00',
    updated_at = to_char(NOW() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD"T"HH24:MI:SS')
WHERE business_start <> '09:00' OR business_end <> '22:00';
