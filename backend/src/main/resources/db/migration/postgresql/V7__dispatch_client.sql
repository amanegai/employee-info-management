CREATE TABLE IF NOT EXISTS dispatch_client (
    id                  BIGSERIAL PRIMARY KEY,
    client_code         TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    location            TEXT,
    industry            TEXT,
    representative_name TEXT,
    capital             TEXT,
    employee_count      TEXT,
    established_date    TEXT,
    trade_start_date    TEXT,
    payment_terms       TEXT,
    payment_method      TEXT,
    client_rank         TEXT,
    contract_status     TEXT NOT NULL DEFAULT '商談中',
    notes               TEXT,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL,
    deleted_at          TEXT
);

CREATE TABLE IF NOT EXISTS dispatch_client_contact (
    id              BIGSERIAL PRIMARY KEY,
    client_id       BIGINT NOT NULL REFERENCES dispatch_client(id) ON DELETE CASCADE,
    contact_name    TEXT NOT NULL,
    department      TEXT,
    position        TEXT,
    project_name    TEXT,
    phone           TEXT,
    email1          TEXT,
    email2          TEXT,
    email3          TEXT,
    responsibility  TEXT,
    notes           TEXT,
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dispatch_client_internal_contact (
    id                 BIGSERIAL PRIMARY KEY,
    client_id          BIGINT NOT NULL REFERENCES dispatch_client(id) ON DELETE CASCADE,
    contact_name       TEXT NOT NULL,
    department         TEXT,
    position           TEXT,
    phone              TEXT,
    email              TEXT,
    client_department  TEXT,
    responsibility     TEXT,
    notes              TEXT,
    sort_order         INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_dispatch_client_name ON dispatch_client(name);
CREATE INDEX IF NOT EXISTS idx_dispatch_client_status ON dispatch_client(contract_status);
CREATE INDEX IF NOT EXISTS idx_dispatch_client_deleted ON dispatch_client(deleted_at);
CREATE INDEX IF NOT EXISTS idx_dispatch_client_contact_client ON dispatch_client_contact(client_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_client_internal_client ON dispatch_client_internal_contact(client_id);
