#!/usr/bin/env python3
"""育児休業申出書テンプレート（.docx）を生成する。"""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "frontend" / "public" / "templates"


def set_japanese_font(run, name="Yu Gothic UI", size=10.5):
    run.font.name = name
    run.font.size = Pt(size)
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)


def add_paragraph(doc, text, *, bold=False, align=None, size=10.5, space_after=6):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    run = p.add_run(text)
    run.bold = bold
    set_japanese_font(run, size=size)
    p.paragraph_format.space_after = Pt(space_after)
    return p


def add_blank_line(doc, height=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(height)
    return p


def add_date_line(doc, prefix, era="令和"):
    text = f"{prefix}{era}　　　年　　月　　日"
    add_paragraph(doc, text, space_after=4)


def add_period_block(doc, title=None):
    if title:
        add_paragraph(doc, title, bold=True, space_after=4)
    add_paragraph(
        doc,
        "令和　　　年　　月　　日から　　令和　　　年　　月　　日まで",
        space_after=2,
    )
    add_paragraph(doc, "（職場復帰予定日　令和　　　年　　月　　日）", space_after=8)


def build_male_childcare_doc():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

    add_paragraph(doc, "社内様式1", align=WD_ALIGN_PARAGRAPH.RIGHT, size=9, space_after=2)
    add_paragraph(doc, "育児休業申出書（男性社員必須）", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=14, space_after=12)
    add_paragraph(doc, "人事部長　　　　　　　　　　殿", space_after=10)
    add_date_line(doc, "［申出日］")
    add_paragraph(doc, "［申出者］　　　　部　　　　課", space_after=2)
    add_paragraph(doc, "氏　名　", space_after=10)
    add_paragraph(
        doc,
        "私は、育児・介護休業等に関する規則（第3条）に基づき、下記のとおり育児休業の申出をします。",
        space_after=10,
    )
    add_paragraph(doc, "記", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)

    add_paragraph(doc, "１　休業に係る子の状況", bold=True, space_after=6)
    for label in ["（1）氏名", "（2）生年月日", "（3）本人との続柄"]:
        add_paragraph(doc, label, space_after=2)
        add_paragraph(doc, "　", space_after=6)
    add_paragraph(doc, "（4）養子の場合、縁組成立の年月日", space_after=2)
    add_date_line(doc, "　　")

    add_paragraph(doc, "２　1の子が生まれていない場合の出産予定者の状況", bold=True, space_after=6)
    for label in ["（1）氏名", "（2）出産予定日", "（3）本人との続柄"]:
        add_paragraph(doc, label, space_after=2)
        add_paragraph(doc, "　", space_after=6)

    add_paragraph(doc, "３　休業の期間", bold=True, space_after=6)
    add_period_block(doc)
    add_paragraph(doc, "※　2回に分割取得する場合は、1回目と2回目を一括で申し出ること", size=9, space_after=6)
    add_period_block(doc, title="【2回目（該当する場合）】")

    add_paragraph(doc, "４　申出に係る状況", bold=True, space_after=6)
    add_paragraph(
        doc,
        "（1）1歳までの育児休業の場合は休業開始予定日の1か月前、1歳を超えての休業の場合は2週間前に申し出て",
        space_after=2,
    )
    add_paragraph(doc, "　　いる・いない　→　申出が遅れた理由", space_after=2)
    add_paragraph(doc, "　　〔　　　　　　　　　　　　　　　〕", space_after=8)
    add_paragraph(doc, "（2）1の子について育児休業をしたことが（休業予定含む）", space_after=2)
    add_paragraph(doc, "　　ない・ある（　　　回）", space_after=8)
    add_paragraph(doc, "（3）1の子について育児休業の申出を撤回したことが", space_after=2)
    add_paragraph(doc, "　　ない・ある（　　　回）", space_after=8)
    add_paragraph(doc, "（4）配偶者も育児休業をしており、規則第2条第2項に基づき１歳を超えて休業しようとする場合", space_after=2)
    add_paragraph(doc, "　　配偶者の休業開始（予定）日　令和　　　年　　月　　日", space_after=8)
    add_paragraph(doc, "（5）1歳を超えての育児休業の申出の場合で申出者が育児休業中でない場合", space_after=2)
    add_paragraph(doc, "　　配偶者が休業　している・していない", space_after=2)
    add_paragraph(doc, "　　配偶者の休業（予定）日　令和　　　年　　月　　日から　　令和　　　年　　月　　日まで", space_after=10)

    add_paragraph(
        doc,
        "（注）期間契約従業員が「育児・介護休業等に関する規則」第3条第1項なお書きの申出をする場合は、3のみの記入で足ります。",
        size=9,
        space_after=12,
    )
    add_paragraph(doc, "＜提出先＞", bold=True, space_after=2)
    add_paragraph(doc, "直接提出や郵送のほか、電子メールでの提出も可能です。", size=9, space_after=2)
    add_paragraph(doc, "人事部　メールアドレス：jimu@bitcross.co.jp", size=9, space_after=2)
    add_paragraph(doc, "または、ファイル管理（分類：申請書）に .docx 形式でアップロードしてください。", size=9)

    return doc


def build_birth_childcare_doc():
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

    add_paragraph(doc, "社内様式１", align=WD_ALIGN_PARAGRAPH.RIGHT, size=9, space_after=2)
    add_paragraph(doc, "（出生時）育児休業申出書", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, size=14, space_after=12)
    add_paragraph(doc, "殿", space_after=10)
    add_date_line(doc, "［申出日］")
    add_paragraph(doc, "［申出者］所属　　　　　　　　氏名　　　　　　　　", space_after=10)
    add_paragraph(
        doc,
        "私は、育児・介護休業等に関する規則（第３条・第７条）に基づき、下記のとおり（出生時）育児休業の申出をします。",
        space_after=10,
    )
    add_paragraph(doc, "記", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)

    add_paragraph(doc, "１　休業に係る子の状況", bold=True, space_after=6)
    for label in ["（1）氏名", "（2）生年月日", "（3）本人との続柄"]:
        add_paragraph(doc, label, space_after=2)
        add_paragraph(doc, "　", space_after=6)
    add_paragraph(doc, "（4）養子の場合、縁組成立の年月日", space_after=2)
    add_date_line(doc, "　　")

    add_paragraph(doc, "２　1の子が生まれていない場合の出産予定者の状況", bold=True, space_after=6)
    for label in ["氏名", "出産予定日", "本人との続柄"]:
        add_paragraph(doc, label, space_after=2)
        add_paragraph(doc, "　", space_after=6)

    add_paragraph(doc, "３　出生時育児休業（産後パパ育休）", bold=True, space_after=6)
    add_paragraph(doc, "３-１　休業の期間", bold=True, space_after=4)
    add_period_block(doc)
    add_paragraph(
        doc,
        "※　出生時育児休業を２回に分割取得する場合は、１回目と２回目を一括で申し出ること",
        size=9,
        space_after=6,
    )
    add_period_block(doc, title="【2回目（該当する場合）】")

    add_paragraph(doc, "３-２　申出に係る状況", bold=True, space_after=6)
    add_paragraph(doc, "（1）休業開始予定日の 2 週間前に申し出ている・いない→申出が遅れた理由", space_after=2)
    add_paragraph(doc, "　　〔　　　　　　　　　　　　　　　〕", space_after=8)
    add_paragraph(doc, "（2）1 の子について出生時育児休業をしたことが（休業予定含む）", space_after=2)
    add_paragraph(doc, "　　ない・ある（　　　回）", space_after=8)
    add_paragraph(doc, "（3）1 の子について出生時育児休業の申出を撤回したことが", space_after=2)
    add_paragraph(doc, "　　ない・ある（　　　回）", space_after=10)

    add_paragraph(doc, "＜提出先＞", bold=True, space_after=2)
    add_paragraph(doc, "直接提出や郵送のほか、電子メールでの提出も可能です。", size=9, space_after=2)
    add_paragraph(doc, "人事部　メールアドレス：jimu@bitcross.co.jp", size=9, space_after=2)
    add_paragraph(doc, "または、ファイル管理（分類：申請書）に .docx 形式でアップロードしてください。", size=9)
    add_paragraph(
        doc,
        "ファイル名例：{社員ID}_{氏名}_出生時育児休業申出書.docx",
        size=9,
        space_after=2,
    )

    return doc


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    files = [
        ("育児休業申出書(男性社員必須）.docx", build_male_childcare_doc),
        ("出生時育児休業申出書.docx", build_birth_childcare_doc),
    ]
    for name, builder in files:
        path = OUT_DIR / name
        builder().save(path)
        print(f"Generated: {path}")


if __name__ == "__main__":
    main()
