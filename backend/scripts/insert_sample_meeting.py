import sqlite3
from datetime import datetime

DB = r"c:\zk\会社\work\社員情報管理\backend\data\employees.db"

now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
meeting_date = datetime.now().strftime("%Y-%m-%d")

conn = sqlite3.connect(DB)
cur = conn.cursor()

cur.execute("PRAGMA table_info(client_meeting)")
cols = [r[1] for r in cur.fetchall()]
print("client_meeting columns:", cols)

if "client_contact_person" not in cols:
    cur.execute("ALTER TABLE client_meeting ADD COLUMN client_contact_person TEXT")
if "issues_summary" not in cols:
    cur.execute("ALTER TABLE client_meeting ADD COLUMN issues_summary TEXT")
conn.commit()

cur.execute("SELECT id, username FROM auth_user WHERE username = 'sales'")
user = cur.fetchone()
created_by = user[0] if user else None
print("created_by:", created_by)

cur.execute(
    """
    INSERT INTO client_meeting (
        client_name, client_contact_person, title, meeting_date, meeting_time,
        location, agenda, minutes_body, issues_summary, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
    (
        "ABC株式会社",
        "田中 太郎",
        "新サービス提案 初回打合せ",
        meeting_date,
        "14:00-15:30",
        "本社会議室A / オンライン併用",
        "①会社概要説明\n②新サービス提案\n③導入スケジュール確認\n④次回アクション確認",
        "ABC株式会社より新規システム導入の相談を受けた。\n"
        "現行システムの老朽化が課題で、来期からの段階的移行を希望。\n"
        "概算見積は2週間以内に提出する方向で合意。",
        "既存データ移行の工数見積が不確実。\n"
        "セキュリティ要件の詳細確認が必要。",
        created_by,
        now,
        now,
    ),
)
meeting_id = cur.lastrowid
print("meeting_id:", meeting_id)

# 渡辺 優 (営業部長) id=7, 山田 太郎 (部長) id=1
for employee_id in (7, 1):
    cur.execute(
        "INSERT INTO client_meeting_attendee (meeting_id, employee_id, note) VALUES (?, ?, ?)",
        (meeting_id, employee_id, None),
    )

cur.execute(
    """
    INSERT INTO client_issue (
        client_name, meeting_id, title, description, status, priority,
        due_date, assignee_employee_id, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
    (
        "ABC株式会社",
        meeting_id,
        "概算見積書の作成・送付",
        "機能一覧と工数前提を整理し、概算見積を2週間以内に提出する。",
        "対応中",
        "高",
        datetime.now().strftime("%Y-%m-%d"),
        7,
        created_by,
        now,
        now,
    ),
)

cur.execute(
    """
    INSERT INTO client_issue (
        client_name, meeting_id, title, description, status, priority,
        due_date, assignee_employee_id, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
    (
        "ABC株式会社",
        meeting_id,
        "セキュリティ要件ヒアリング",
        "顧客側IT担当者への追加ヒアリングを設定する。",
        "未着手",
        "中",
        None,
        1,
        created_by,
        now,
        now,
    ),
)

conn.commit()
conn.close()
print("Sample meeting record inserted successfully.")
