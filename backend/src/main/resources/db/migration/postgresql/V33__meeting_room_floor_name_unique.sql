DROP INDEX IF EXISTS idx_meeting_room_name_normalized;

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_room_floor_name_normalized
    ON meeting_room (LOWER(TRIM(COALESCE(floor, ''))), LOWER(TRIM(name)));
