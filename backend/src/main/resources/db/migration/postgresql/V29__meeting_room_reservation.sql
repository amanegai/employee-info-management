-- 会議室マスタ
CREATE TABLE IF NOT EXISTS meeting_room (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    floor           TEXT,
    capacity        INTEGER,
    equipment       TEXT,
    slot_minutes    INTEGER NOT NULL DEFAULT 30,
    business_start  TEXT NOT NULL DEFAULT '08:00',
    business_end    TEXT NOT NULL DEFAULT '20:00',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    CONSTRAINT chk_meeting_room_slot_minutes CHECK (slot_minutes IN (15, 30, 60))
);

-- 会議室予約
CREATE TABLE IF NOT EXISTS meeting_room_reservation (
    id              BIGSERIAL PRIMARY KEY,
    room_id         BIGINT NOT NULL REFERENCES meeting_room(id),
    title           TEXT NOT NULL,
    start_at        TEXT NOT NULL,
    end_at          TEXT NOT NULL,
    reserved_by     BIGINT NOT NULL REFERENCES auth_user(id),
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'CONFIRMED',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    CONSTRAINT chk_meeting_room_reservation_status CHECK (status IN ('CONFIRMED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_meeting_room_reservation_room_time
    ON meeting_room_reservation(room_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_meeting_room_reservation_start_at
    ON meeting_room_reservation(start_at);

CREATE INDEX IF NOT EXISTS idx_meeting_room_reservation_reserved_by
    ON meeting_room_reservation(reserved_by);

-- 初期会議室（1 室）
INSERT INTO meeting_room (
    name, floor, capacity, equipment, slot_minutes, business_start, business_end,
    is_active, sort_order, created_at, updated_at
)
SELECT
    '会議室A',
    '3F',
    8,
    'プロジェクター, ホワイトボード',
    30,
    '08:00',
    '20:00',
    TRUE,
    0,
    to_char(NOW() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD"T"HH24:MI:SS'),
    to_char(NOW() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD"T"HH24:MI:SS')
WHERE NOT EXISTS (SELECT 1 FROM meeting_room);
