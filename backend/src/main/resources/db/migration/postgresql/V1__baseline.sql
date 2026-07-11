-- PostgreSQL baseline schema for employee-management

CREATE TABLE IF NOT EXISTS department (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    parent_id   BIGINT REFERENCES department(id)
);

CREATE TABLE IF NOT EXISTS employee (
    id              BIGSERIAL PRIMARY KEY,
    employee_code   TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    department_id   BIGINT REFERENCES department(id),
    position        TEXT NOT NULL DEFAULT '',
    employee_type   TEXT NOT NULL DEFAULT '',
    work_status     TEXT NOT NULL DEFAULT '',
    unit_price      INTEGER NOT NULL DEFAULT 0,
    evaluation      TEXT NOT NULL,
    end_date        TEXT,
    created_at      TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_employee_department ON employee(department_id);
CREATE INDEX IF NOT EXISTS idx_employee_work_status ON employee(work_status);
CREATE INDEX IF NOT EXISTS idx_employee_end_date ON employee(end_date);

CREATE TABLE IF NOT EXISTS auth_user (
    id              BIGSERIAL PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL DEFAULT '',
    email           TEXT,
    department_id   BIGINT REFERENCES department(id),
    enabled         SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS auth_user_role (
    user_id         BIGINT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_auth_user_username ON auth_user(username);

CREATE TABLE IF NOT EXISTS employee_personal (
    employee_id       BIGINT PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    gender            TEXT,
    birth_date        TEXT,
    nationality       TEXT,
    phone             TEXT,
    email             TEXT,
    address           TEXT,
    education         TEXT,
    nearest_station   TEXT,
    photo_url         TEXT,
    furigana          TEXT,
    marital_status    TEXT,
    it_industry_years INTEGER,
    japan_arrival_date TEXT,
    education_degree  TEXT,
    school_name       TEXT,
    major             TEXT,
    japanese_level    TEXT,
    japanese_conversation TEXT,
    japanese_reading  TEXT,
    japanese_writing  TEXT,
    english_level     TEXT,
    english_conversation TEXT,
    english_reading   TEXT,
    english_writing   TEXT,
    technical_level   TEXT,
    specialty_dev     TEXT,
    specialty_business TEXT,
    self_pr           TEXT
);

CREATE TABLE IF NOT EXISTS employee_technical_skill (
    id                BIGSERIAL PRIMARY KEY,
    employee_id       BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    category          TEXT NOT NULL,
    item_name         TEXT NOT NULL,
    level             TEXT NOT NULL,
    sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_technical_skill_unique
    ON employee_technical_skill(employee_id, category, item_name);

CREATE TABLE IF NOT EXISTS employee_skill (
    id                BIGSERIAL PRIMARY KEY,
    employee_id       BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    skill_name        TEXT NOT NULL,
    level             INTEGER NOT NULL DEFAULT 3,
    experience_years  INTEGER NOT NULL DEFAULT 0,
    sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_unique
    ON employee_skill(employee_id, skill_name);

CREATE TABLE IF NOT EXISTS employee_qualification (
    id                BIGSERIAL PRIMARY KEY,
    employee_id       BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    description       TEXT NOT NULL,
    sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qualification_unique
    ON employee_qualification(employee_id, description);

CREATE TABLE IF NOT EXISTS employee_career (
    id                BIGSERIAL PRIMARY KEY,
    employee_id       BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    period            TEXT NOT NULL,
    organization      TEXT NOT NULL,
    role_overview     TEXT NOT NULL,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    start_date        TEXT,
    end_date          TEXT,
    months            INTEGER,
    workplace         TEXT,
    role              TEXT,
    os_db             TEXT,
    languages         TEXT,
    fw_tools          TEXT,
    phases            TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_career_unique
    ON employee_career(employee_id, period, organization);

CREATE TABLE IF NOT EXISTS employee_attendance (
    employee_id           BIGINT PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    attendance_rate       INTEGER NOT NULL DEFAULT 0,
    late_early_count      INTEGER NOT NULL DEFAULT 0,
    paid_leave_remaining  INTEGER NOT NULL DEFAULT 0,
    period_label          TEXT
);

CREATE TABLE IF NOT EXISTS employee_evaluation_history (
    employee_id              BIGINT PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    year_label               TEXT NOT NULL,
    status_text              TEXT NOT NULL,
    next_evaluation_note     TEXT
);

CREATE TABLE IF NOT EXISTS employee_memo (
    employee_id       BIGINT PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    content           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employee_evaluation_item (
    id                BIGSERIAL PRIMARY KEY,
    employee_id       BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    category_code     TEXT NOT NULL,
    item_name         TEXT NOT NULL,
    rank_grade        TEXT NOT NULL,
    comment           TEXT NOT NULL,
    sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eval_item_unique
    ON employee_evaluation_item(employee_id, category_code, item_name);

CREATE TABLE IF NOT EXISTS employee_overall_evaluation (
    employee_id              BIGINT PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    overall_rank             TEXT NOT NULL,
    rank_label               TEXT,
    continuation_text        TEXT,
    evaluation_date          TEXT,
    evaluator_name           TEXT,
    evaluator_department     TEXT,
    overall_comment          TEXT
);

CREATE TABLE IF NOT EXISTS employee_salary (
    employee_id           BIGINT PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    basic_salary_monthly  INTEGER NOT NULL DEFAULT 0,
    commuter_allowance    INTEGER NOT NULL DEFAULT 0,
    annual_salary         INTEGER NOT NULL DEFAULT 0,
    bonus                 INTEGER NOT NULL DEFAULT 0,
    overtime_rate         INTEGER NOT NULL DEFAULT 0,
    payment_day           TEXT,
    billing_unit_price    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS employee_hr (
    employee_id                 BIGINT PRIMARY KEY REFERENCES employee(id) ON DELETE CASCADE,
    hire_date                   TEXT,
    contract_start_date         TEXT,
    contract_end_date           TEXT,
    social_insurance_status     TEXT,
    employment_insurance_no     TEXT,
    pension_no                  TEXT,
    emergency_contact_name      TEXT,
    emergency_contact_phone     TEXT,
    emergency_contact_relation  TEXT,
    paid_leave_start_date       TEXT
);

CREATE TABLE IF NOT EXISTS client_event (
    id              BIGSERIAL PRIMARY KEY,
    client_name     TEXT NOT NULL,
    event_name      TEXT NOT NULL,
    event_date      TEXT NOT NULL,
    event_time      TEXT,
    location        TEXT,
    event_type      TEXT NOT NULL DEFAULT 'その他',
    event_status    TEXT NOT NULL DEFAULT '予定',
    notes           TEXT,
    created_by      BIGINT REFERENCES auth_user(id),
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_event_participant (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT NOT NULL REFERENCES client_event(id) ON DELETE CASCADE,
    employee_id     BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    note            TEXT,
    UNIQUE(event_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_client_event_date ON client_event(event_date);
CREATE INDEX IF NOT EXISTS idx_client_event_client ON client_event(client_name);
CREATE INDEX IF NOT EXISTS idx_client_event_participant_event ON client_event_participant(event_id);
CREATE INDEX IF NOT EXISTS idx_client_event_participant_employee ON client_event_participant(employee_id);
CREATE INDEX IF NOT EXISTS idx_client_event_status ON client_event(event_status);

CREATE TABLE IF NOT EXISTS client_event_reminder_log (
    id              BIGSERIAL PRIMARY KEY,
    event_id        BIGINT NOT NULL REFERENCES client_event(id) ON DELETE CASCADE,
    employee_id     BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    reminder_days   INTEGER NOT NULL,
    event_date      TEXT NOT NULL,
    sent_at         TEXT NOT NULL,
    UNIQUE(event_id, employee_id, reminder_days, event_date)
);

CREATE INDEX IF NOT EXISTS idx_client_event_reminder_event ON client_event_reminder_log(event_id);

CREATE TABLE IF NOT EXISTS client_meeting (
    id                      BIGSERIAL PRIMARY KEY,
    client_name             TEXT NOT NULL,
    client_contact_person   TEXT,
    title                   TEXT NOT NULL,
    meeting_date            TEXT NOT NULL,
    meeting_time            TEXT,
    location                TEXT,
    agenda                  TEXT,
    minutes_body            TEXT,
    issues_summary          TEXT,
    created_by              BIGINT REFERENCES auth_user(id),
    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_meeting_attendee (
    id              BIGSERIAL PRIMARY KEY,
    meeting_id      BIGINT NOT NULL REFERENCES client_meeting(id) ON DELETE CASCADE,
    employee_id     BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    note            TEXT,
    UNIQUE(meeting_id, employee_id)
);

CREATE TABLE IF NOT EXISTS client_issue (
    id                      BIGSERIAL PRIMARY KEY,
    client_name             TEXT NOT NULL,
    meeting_id              BIGINT REFERENCES client_meeting(id) ON DELETE SET NULL,
    title                   TEXT NOT NULL,
    description             TEXT,
    status                  TEXT NOT NULL DEFAULT '未着手',
    priority                TEXT NOT NULL DEFAULT '中',
    due_date                TEXT,
    assignee_employee_id    BIGINT REFERENCES employee(id) ON DELETE SET NULL,
    created_by              BIGINT REFERENCES auth_user(id),
    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_meeting_date ON client_meeting(meeting_date);
CREATE INDEX IF NOT EXISTS idx_client_meeting_client ON client_meeting(client_name);
CREATE INDEX IF NOT EXISTS idx_client_meeting_attendee_meeting ON client_meeting_attendee(meeting_id);
CREATE INDEX IF NOT EXISTS idx_client_meeting_attendee_employee ON client_meeting_attendee(employee_id);
CREATE INDEX IF NOT EXISTS idx_client_issue_client ON client_issue(client_name);
CREATE INDEX IF NOT EXISTS idx_client_issue_status ON client_issue(status);
CREATE INDEX IF NOT EXISTS idx_client_issue_due_date ON client_issue(due_date);
CREATE INDEX IF NOT EXISTS idx_client_issue_meeting ON client_issue(meeting_id);
CREATE INDEX IF NOT EXISTS idx_client_issue_assignee ON client_issue(assignee_employee_id);

CREATE TABLE IF NOT EXISTS dispatch_project (
    id                  BIGSERIAL PRIMARY KEY,
    client_name         TEXT NOT NULL,
    project_name        TEXT NOT NULL,
    project_text        TEXT,
    required_skills     TEXT,
    work_location       TEXT,
    expected_start_date TEXT,
    expected_end_date   TEXT,
    headcount_required  INTEGER NOT NULL DEFAULT 1,
    headcount_filled    INTEGER NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'OPEN',
    owner_user_id       BIGINT REFERENCES auth_user(id),
    notes               TEXT,
    created_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS'),
    updated_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_dispatch_project_client ON dispatch_project(client_name);
CREATE INDEX IF NOT EXISTS idx_dispatch_project_status ON dispatch_project(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_project_start ON dispatch_project(expected_start_date);

CREATE TABLE IF NOT EXISTS project_candidate (
    id                  BIGSERIAL PRIMARY KEY,
    project_id          BIGINT NOT NULL REFERENCES dispatch_project(id) ON DELETE CASCADE,
    employee_id         BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    stage               TEXT NOT NULL DEFAULT 'MATCHED',
    match_score         INTEGER,
    matched_skills      TEXT,
    proposed_at         TEXT,
    interview_at        TEXT,
    confirmed_at        TEXT,
    closed_at           TEXT,
    close_reason        TEXT,
    notes               TEXT,
    created_by          BIGINT REFERENCES auth_user(id),
    created_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS'),
    updated_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS'),
    UNIQUE(project_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_project_candidate_project ON project_candidate(project_id);
CREATE INDEX IF NOT EXISTS idx_project_candidate_employee ON project_candidate(employee_id);
CREATE INDEX IF NOT EXISTS idx_project_candidate_stage ON project_candidate(stage);

CREATE TABLE IF NOT EXISTS employee_project_assignment (
    id                  BIGSERIAL PRIMARY KEY,
    employee_id         BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    project_id          BIGINT NOT NULL REFERENCES dispatch_project(id) ON DELETE CASCADE,
    candidate_id        BIGINT REFERENCES project_candidate(id) ON DELETE SET NULL,
    client_name         TEXT NOT NULL,
    project_name        TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'PLANNED',
    start_date          TEXT NOT NULL,
    end_date            TEXT,
    is_primary          SMALLINT NOT NULL DEFAULT 1,
    notes               TEXT,
    confirmed_by        BIGINT REFERENCES auth_user(id),
    confirmed_at        TEXT NOT NULL,
    created_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS'),
    updated_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_assignment_employee ON employee_project_assignment(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignment_project ON employee_project_assignment(project_id);
CREATE INDEX IF NOT EXISTS idx_assignment_status ON employee_project_assignment(status);
CREATE INDEX IF NOT EXISTS idx_assignment_start ON employee_project_assignment(start_date);
CREATE INDEX IF NOT EXISTS idx_assignment_end ON employee_project_assignment(end_date);

CREATE TABLE IF NOT EXISTS employee_status_change_log (
    id                  BIGSERIAL PRIMARY KEY,
    employee_id         BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    old_work_status     TEXT,
    new_work_status     TEXT NOT NULL,
    old_end_date        TEXT,
    new_end_date        TEXT,
    trigger_type        TEXT NOT NULL,
    trigger_ref_id      BIGINT,
    reason              TEXT NOT NULL,
    applied_by          BIGINT REFERENCES auth_user(id),
    created_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_status_log_employee ON employee_status_change_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_status_log_created ON employee_status_change_log(created_at);

CREATE TABLE IF NOT EXISTS employee_status_suggestion (
    id                   BIGSERIAL PRIMARY KEY,
    employee_id          BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    suggested_status     TEXT NOT NULL,
    suggested_end_date   TEXT,
    reason               TEXT NOT NULL,
    source_assignment_id BIGINT REFERENCES employee_project_assignment(id) ON DELETE SET NULL,
    status               TEXT NOT NULL DEFAULT 'PENDING',
    created_at           TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS'),
    resolved_at          TEXT,
    resolved_by          BIGINT REFERENCES auth_user(id)
);

CREATE INDEX IF NOT EXISTS idx_status_suggestion_pending ON employee_status_suggestion(status, employee_id);

CREATE TABLE IF NOT EXISTS assignment_cancel_followup (
    id                  BIGSERIAL PRIMARY KEY,
    employee_id         BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    assignment_id       BIGINT REFERENCES employee_project_assignment(id) ON DELETE SET NULL,
    project_id          BIGINT REFERENCES dispatch_project(id) ON DELETE SET NULL,
    cancel_reason       TEXT,
    status              TEXT NOT NULL DEFAULT 'OPEN',
    assigned_to         BIGINT REFERENCES auth_user(id),
    due_date            TEXT,
    notes               TEXT,
    created_by          BIGINT REFERENCES auth_user(id),
    created_at          TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS'),
    resolved_at         TEXT,
    resolved_by         BIGINT REFERENCES auth_user(id)
);

CREATE INDEX IF NOT EXISTS idx_cancel_followup_status ON assignment_cancel_followup(status, due_date);
CREATE INDEX IF NOT EXISTS idx_cancel_followup_assignee ON assignment_cancel_followup(assigned_to, status);

CREATE TABLE IF NOT EXISTS _schema_patches (
    name TEXT PRIMARY KEY
);
