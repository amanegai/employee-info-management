CREATE TABLE IF NOT EXISTS auth_user (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL DEFAULT '',
    email           TEXT,
    department_id   INTEGER REFERENCES department(id),
    enabled         INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS auth_user_role (
    user_id         INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_auth_user_username ON auth_user(username);

ALTER TABLE auth_user ADD COLUMN department_id INTEGER REFERENCES department(id);
ALTER TABLE auth_user ADD COLUMN email TEXT;
ALTER TABLE auth_user ADD COLUMN totp_secret TEXT;
ALTER TABLE auth_user ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
