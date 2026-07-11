#!/usr/bin/env python3
"""
SQLite employees.db → PostgreSQL employee_mgmt 数据迁移。

依赖: pip install psycopg2-binary

用法:
  python scripts/migrate-sqlite-to-postgres.py
  python scripts/migrate-sqlite-to-postgres.py --sqlite backend/data/employees.db --dry-run
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import execute_batch
except ImportError:
    print("Install dependency: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SQLITE = ROOT / "backend" / "data" / "employees.db"

PG_HOST = "localhost"
PG_PORT = 5432
PG_DB = "employee_mgmt"
PG_USER = "employee_app"
PG_PASSWORD = "employee_app_dev"

# 按外键依赖顺序插入；id 列为 BIGSERIAL 的表会在导入后 reset sequence
TABLES: list[tuple[str, list[str], bool]] = [
    ("department", ["id", "name", "parent_id"], True),
    ("auth_user", ["id", "username", "password_hash", "display_name", "enabled", "department_id", "email"], True),
    ("employee", [
        "id", "employee_code", "name", "department_id", "position", "employee_type",
        "work_status", "unit_price", "evaluation", "end_date", "created_at",
    ], True),
    ("auth_user_role", ["user_id", "role"], False),
    ("employee_personal", [
        "employee_id", "gender", "birth_date", "nationality", "phone", "email", "address",
        "education", "nearest_station", "photo_url", "furigana", "marital_status",
        "it_industry_years", "japan_arrival_date", "education_degree", "school_name", "major",
        "japanese_level", "japanese_conversation", "japanese_reading", "japanese_writing",
        "english_level", "english_conversation", "english_reading", "english_writing",
        "technical_level", "specialty_dev", "specialty_business", "self_pr",
    ], False),
    ("employee_technical_skill", ["id", "employee_id", "category", "item_name", "level", "sort_order"], True),
    ("employee_skill", ["id", "employee_id", "skill_name", "level", "experience_years", "sort_order"], True),
    ("employee_qualification", ["id", "employee_id", "description", "sort_order"], True),
    ("employee_career", [
        "id", "employee_id", "period", "organization", "role_overview", "sort_order",
        "start_date", "end_date", "months", "workplace", "role", "os_db", "languages", "fw_tools", "phases",
    ], True),
    ("employee_attendance", ["employee_id", "attendance_rate", "late_early_count", "paid_leave_remaining", "period_label"], False),
    ("employee_evaluation_history", ["employee_id", "year_label", "status_text", "next_evaluation_note"], False),
    ("employee_memo", ["employee_id", "content"], False),
    ("employee_evaluation_item", ["id", "employee_id", "category_code", "item_name", "rank_grade", "comment", "sort_order"], True),
    ("employee_overall_evaluation", [
        "employee_id", "overall_rank", "rank_label", "continuation_text", "evaluation_date",
        "evaluator_name", "evaluator_department", "overall_comment",
    ], False),
    ("employee_salary", [
        "employee_id", "basic_salary_monthly", "commuter_allowance", "annual_salary",
        "bonus", "overtime_rate", "payment_day", "billing_unit_price",
    ], False),
    ("employee_hr", [
        "employee_id", "hire_date", "contract_start_date", "contract_end_date",
        "social_insurance_status", "employment_insurance_no", "pension_no",
        "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
        "paid_leave_start_date",
    ], False),
    ("client_event", [
        "id", "client_name", "event_name", "event_date", "event_time", "location",
        "event_type", "event_status", "notes", "created_by", "created_at", "updated_at",
    ], True),
    ("client_event_participant", ["id", "event_id", "employee_id", "note"], True),
    ("client_event_reminder_log", ["id", "event_id", "employee_id", "reminder_days", "event_date", "sent_at"], True),
    ("client_meeting", [
        "id", "client_name", "client_contact_person", "title", "meeting_date", "meeting_time",
        "location", "agenda", "minutes_body", "issues_summary", "created_by", "created_at", "updated_at",
    ], True),
    ("client_meeting_attendee", ["id", "meeting_id", "employee_id", "note"], True),
    ("client_issue", [
        "id", "client_name", "meeting_id", "title", "description", "status", "priority",
        "due_date", "assignee_employee_id", "created_by", "created_at", "updated_at",
    ], True),
    ("dispatch_project", [
        "id", "client_name", "project_name", "project_text", "required_skills", "work_location",
        "expected_start_date", "expected_end_date", "headcount_required", "headcount_filled",
        "status", "owner_user_id", "notes", "created_at", "updated_at",
    ], True),
    ("project_candidate", [
        "id", "project_id", "employee_id", "stage", "match_score", "matched_skills",
        "proposed_at", "interview_at", "confirmed_at", "closed_at", "close_reason", "notes",
        "created_by", "created_at", "updated_at",
    ], True),
    ("employee_project_assignment", [
        "id", "employee_id", "project_id", "candidate_id", "client_name", "project_name",
        "status", "start_date", "end_date", "is_primary", "notes", "confirmed_by",
        "confirmed_at", "created_at", "updated_at",
    ], True),
    ("employee_status_change_log", [
        "id", "employee_id", "old_work_status", "new_work_status", "old_end_date", "new_end_date",
        "trigger_type", "trigger_ref_id", "reason", "applied_by", "created_at",
    ], True),
    ("employee_status_suggestion", [
        "id", "employee_id", "suggested_status", "suggested_end_date", "reason",
        "source_assignment_id", "status", "created_at", "resolved_at", "resolved_by",
    ], True),
    ("assignment_cancel_followup", [
        "id", "employee_id", "assignment_id", "project_id", "cancel_reason", "status",
        "assigned_to", "due_date", "notes", "created_by", "created_at", "resolved_at", "resolved_by",
    ], True),
    ("_schema_patches", ["name"], False),
]

TRUNCATE_TABLES = [t[0] for t in reversed(TABLES)]

# 子表 -> [(父表, 外键列名), ...]；仅保留父表存在的行（NULL 外键保留）
FK_FILTERS: dict[str, list[tuple[str, str]]] = {
    "auth_user": [("department", "department_id")],
    "employee": [("department", "department_id")],
    "auth_user_role": [("auth_user", "user_id")],
    "employee_personal": [("employee", "employee_id")],
    "employee_technical_skill": [("employee", "employee_id")],
    "employee_skill": [("employee", "employee_id")],
    "employee_qualification": [("employee", "employee_id")],
    "employee_career": [("employee", "employee_id")],
    "employee_attendance": [("employee", "employee_id")],
    "employee_evaluation_history": [("employee", "employee_id")],
    "employee_memo": [("employee", "employee_id")],
    "employee_evaluation_item": [("employee", "employee_id")],
    "employee_overall_evaluation": [("employee", "employee_id")],
    "employee_salary": [("employee", "employee_id")],
    "employee_hr": [("employee", "employee_id")],
    "client_event": [("auth_user", "created_by")],
    "client_event_participant": [("client_event", "event_id"), ("employee", "employee_id")],
    "client_event_reminder_log": [("client_event", "event_id"), ("employee", "employee_id")],
    "client_meeting": [("auth_user", "created_by")],
    "client_meeting_attendee": [("client_meeting", "meeting_id"), ("employee", "employee_id")],
    "client_issue": [
        ("client_meeting", "meeting_id"),
        ("employee", "assignee_employee_id"),
        ("auth_user", "created_by"),
    ],
    "dispatch_project": [("auth_user", "owner_user_id")],
    "project_candidate": [
        ("dispatch_project", "project_id"),
        ("employee", "employee_id"),
        ("auth_user", "created_by"),
    ],
    "employee_project_assignment": [
        ("employee", "employee_id"),
        ("dispatch_project", "project_id"),
        ("project_candidate", "candidate_id"),
        ("auth_user", "confirmed_by"),
    ],
    "employee_status_change_log": [("employee", "employee_id"), ("auth_user", "applied_by")],
    "employee_status_suggestion": [
        ("employee", "employee_id"),
        ("employee_project_assignment", "source_assignment_id"),
        ("auth_user", "resolved_by"),
    ],
    "assignment_cancel_followup": [
        ("employee", "employee_id"),
        ("employee_project_assignment", "assignment_id"),
        ("dispatch_project", "project_id"),
        ("auth_user", "assigned_to"),
        ("auth_user", "created_by"),
        ("auth_user", "resolved_by"),
    ],
}


def connect_pg():
    return psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DB,
        user=PG_USER,
        password=PG_PASSWORD,
    )


def load_parent_ids(sqlite_conn: sqlite3.Connection) -> dict[str, set]:
    ids: dict[str, set] = {}
    for table, columns, has_serial in TABLES:
        if has_serial and "id" in columns:
            ids[table] = {r[0] for r in sqlite_conn.execute(f"SELECT id FROM [{table}]")}
    return ids


def filter_rows(
    table: str,
    columns: list[str],
    rows: list[tuple],
    parent_ids: dict[str, set],
) -> tuple[list[tuple], int]:
    filters = FK_FILTERS.get(table, [])
    if not filters:
        return rows, 0

    col_index = {name: idx for idx, name in enumerate(columns)}
    kept: list[tuple] = []
    skipped = 0
    for row in rows:
        valid = True
        for parent_table, fk_col in filters:
            idx = col_index[fk_col]
            value = row[idx]
            if value is None:
                continue
            if value not in parent_ids.get(parent_table, set()):
                valid = False
                break
        if valid:
            kept.append(row)
        else:
            skipped += 1
    return kept, skipped


def fetch_sqlite_rows(
    sqlite_conn: sqlite3.Connection,
    table: str,
    columns: list[str],
    parent_ids: dict[str, set] | None = None,
) -> tuple[list[tuple], int]:
    col_sql = ", ".join(f"[{c}]" for c in columns)
    cur = sqlite_conn.execute(f"SELECT {col_sql} FROM [{table}]")
    rows = cur.fetchall()
    if parent_ids is None:
        return rows, 0
    return filter_rows(table, columns, rows, parent_ids)


def copy_table(
    sqlite_conn: sqlite3.Connection,
    pg_conn,
    table: str,
    columns: list[str],
    reset_seq: bool,
    dry_run: bool,
    parent_ids: dict[str, set] | None = None,
) -> tuple[int, int]:
    rows, skipped = fetch_sqlite_rows(sqlite_conn, table, columns, parent_ids)
    if dry_run:
        suffix = f" (skip {skipped} orphan)" if skipped else ""
        print(f"  {table}: {len(rows)} rows{suffix}")
        return len(rows), skipped

    if skipped:
        print(f"  {table}: skip {skipped} orphan rows")

    col_list = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    insert_sql = f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})"

    with pg_conn.cursor() as cur:
        if rows:
            execute_batch(cur, insert_sql, rows, page_size=500)
        if reset_seq and rows:
            cur.execute(
                f"""
                SELECT setval(
                    pg_get_serial_sequence(%s, 'id'),
                    COALESCE((SELECT MAX(id) FROM {table}), 1)
                )
                """,
                (table,),
            )
    return len(rows), skipped


def verify_counts(sqlite_conn: sqlite3.Connection, pg_conn, parent_ids: dict[str, set]) -> bool:
    ok = True
    for table, columns, _ in TABLES:
        rows, _ = fetch_sqlite_rows(sqlite_conn, table, columns, parent_ids)
        sq = len(rows)
        with pg_conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            pg = cur.fetchone()[0]
        status = "OK" if sq == pg else "MISMATCH"
        if sq != pg:
            ok = False
        print(f"  {table}: sqlite={sq} postgres={pg} [{status}]")
    return ok


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate SQLite employees.db to PostgreSQL")
    parser.add_argument("--sqlite", type=Path, default=DEFAULT_SQLITE, help="SQLite database path")
    parser.add_argument("--dry-run", action="store_true", help="Only report row counts, no writes")
    args = parser.parse_args()

    if not args.sqlite.is_file():
        print(f"SQLite not found: {args.sqlite}", file=sys.stderr)
        return 1

    print(f"Source: {args.sqlite}")
    print(f"Target: {PG_USER}@{PG_HOST}:{PG_PORT}/{PG_DB}")
    print()

    sqlite_conn = sqlite3.connect(str(args.sqlite))
    sqlite_conn.row_factory = sqlite3.Row

    if args.dry_run:
        print("=== Dry-run row counts ===")
        parent_ids = load_parent_ids(sqlite_conn)
        total = 0
        for table, columns, _ in TABLES:
            n, skipped = copy_table(sqlite_conn, None, table, columns, False, True, parent_ids)
            total += n
        print(f"Total: {total} rows")
        sqlite_conn.close()
        return 0

    pg_conn = connect_pg()
    pg_conn.autocommit = False

    try:
        print("=== Truncate PostgreSQL tables (keep flyway_schema_history) ===")
        truncate_sql = f"TRUNCATE TABLE {', '.join(TRUNCATE_TABLES)} RESTART IDENTITY CASCADE"
        with pg_conn.cursor() as cur:
            cur.execute(truncate_sql)
        pg_conn.commit()
        print("  done")

        print()
        print("=== Import data ===")
        parent_ids = load_parent_ids(sqlite_conn)
        total = 0
        for table, columns, reset_seq in TABLES:
            n, _ = copy_table(sqlite_conn, pg_conn, table, columns, reset_seq, False, parent_ids)
            total += n
            print(f"  {table}: {n} rows")
        pg_conn.commit()
        print(f"Total imported: {total} rows")

        print()
        print("=== Verify row counts ===")
        if verify_counts(sqlite_conn, pg_conn, parent_ids):
            print()
            print("Migration succeeded.")
            return 0
        print()
        print("WARNING: row count mismatch on some tables.", file=sys.stderr)
        return 2
    except Exception as exc:
        pg_conn.rollback()
        print(f"Migration failed: {exc}", file=sys.stderr)
        raise
    finally:
        sqlite_conn.close()
        pg_conn.close()


if __name__ == "__main__":
    sys.exit(main())
