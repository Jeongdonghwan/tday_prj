"""심리테스트 MD 파서 + 시드 + 유형 집계 채점 (DESIGN_UPDATE §6)."""
import re
from collections import Counter

from ..extensions import db


def _find(pattern: str, text: str):
    m = re.search(pattern, text)
    return m.group(1).strip() if m else None


def parse_test_md(text: str) -> dict:
    """test01_love_type.md 형식을 파싱. 이후 테스트도 같은 포맷."""
    h1 = next((l for l in text.split("\n") if l.startswith("# ")), "")
    raw_title = h1[2:].strip()
    title = raw_title.split(":", 1)[1].strip() if ":" in raw_title else raw_title

    slug = _find(r"-\s*slug:\s*`?([\w-]+)`?", text)
    intro = _find(r'-\s*인트로:\s*"?([^"\n]+)"?', text)

    tb = re.search(r"우선순위[:：]\s*([A-Z ,>]+)", text)
    tiebreak = re.findall(r"[A-Z]{2,}", tb.group(1)) if tb else []

    code_names: dict[str, str] = {}
    cn = re.search(r"유형 코드[:：]\s*(.+)", text)
    if cn:
        for pair in cn.group(1).split("/"):
            m = re.match(r"\s*([A-Z]{2,})\s+(\S+)", pair.strip())
            if m:
                code_names[m.group(1)] = m.group(2)

    questions = []
    for i, m in enumerate(re.finditer(r"\*\*Q\d+\.\s*(.+?)\*\*\s*\n((?:-\s*.+\n?)+)", text)):
        choices = [
            {"text": cm.group(1).strip(), "code": cm.group(2)}
            for cm in re.finditer(r"-\s*(.+?)\s*→\s*([A-Z]{2,})", m.group(2))
        ]
        questions.append({"sort": i + 1, "question": m.group(1).strip(), "choices": choices})

    results = []
    for rm in re.finditer(
        r"###\s*([A-Z]{2,})\s*·\s*(.+?)\s*\(avatar_no=(\d+)\)\s*\n(.*?)(?=\n###|\Z)", text, re.DOTALL
    ):
        block = rm.group(4).strip()
        desc = re.split(r"\n-\s*잘 맞는", block, maxsplit=1)[0].strip()
        catchphrase = re.split(r"(?<=[.!?])\s", desc)[0].strip()[:80] if desc else ""
        results.append({
            "code": rm.group(1),
            "title": rm.group(2).strip(),
            "avatar_no": int(rm.group(3)),
            "description": desc,
            "catchphrase": catchphrase,
            "match_name": (_find(r"-\s*잘 맞는 유형:\s*([^(（\n]+)", block) or "").strip(),
            "clash_name": (_find(r"-\s*자주 부딪히는 유형:\s*([^(（\n]+)", block) or "").strip(),
        })

    animal_to_code = {name: code for code, name in code_names.items()}

    def resolve(name: str):
        for animal, code in animal_to_code.items():
            if animal and animal in name:
                return code
        return None

    for r in results:
        r["match_code"] = resolve(r["match_name"])
        r["clash_code"] = resolve(r["clash_name"])

    return {
        "slug": slug,
        "title": title,
        "intro": intro,
        "tiebreak": tiebreak,
        "code_names": code_names,
        "questions": questions,
        "results": results,
    }


def seed_test(text: str):
    """파싱 → DB 등록. slug 중복이면 건너뜀(idempotent)."""
    from ..models import Test, TestQuestion, TestResult

    data = parse_test_md(text)
    if not data["slug"] or Test.query.filter_by(slug=data["slug"]).first():
        return None

    test = Test(
        slug=data["slug"],
        title=data["title"],
        intro=data["intro"],
        tiebreak=",".join(data["tiebreak"]),
        is_active=True,
    )
    db.session.add(test)
    db.session.flush()

    for q in data["questions"]:
        ch = q["choices"]
        db.session.add(TestQuestion(
            test_id=test.id,
            sort_order=q["sort"],
            question=q["question"],
            choice1=ch[0]["text"], choice1_code=ch[0]["code"],
            choice2=ch[1]["text"], choice2_code=ch[1]["code"],
            choice3=ch[2]["text"] if len(ch) > 2 else None,
            choice3_code=ch[2]["code"] if len(ch) > 2 else None,
        ))
    for r in data["results"]:
        db.session.add(TestResult(
            test_id=test.id, code=r["code"], title=r["title"], catchphrase=r["catchphrase"],
            description=r["description"], match_code=r["match_code"], clash_code=r["clash_code"],
            avatar_no=r["avatar_no"],
        ))
    db.session.commit()
    return test


def create_test_from_data(data: dict, update: bool = False):
    """구조화 데이터(app/seeds/love_tests.py 형식) → DB 등록.

    slug 중복 시: update=False → 건너뜀(None), update=True → 내용 갱신(문항 교체,
    결과는 코드별 in-place 업데이트로 result_id 보존 → 기존 TestAttempt 무해).
    """
    from ..models import Test, TestQuestion, TestResult

    if not data.get("slug"):
        return None
    existing = Test.query.filter_by(slug=data["slug"]).first()
    if existing and not update:
        return None

    test = existing or Test(slug=data["slug"], is_active=True)
    test.title = data["title"]
    test.intro = data.get("intro")
    test.tiebreak = ",".join(data.get("tiebreak", []))
    if not existing:
        db.session.add(test)
    db.session.flush()

    # 문항: 전체 교체 (FK 의존 없음)
    if existing:
        TestQuestion.query.filter_by(test_id=test.id).delete()
    for i, (q, choices) in enumerate(data["questions"], 1):
        db.session.add(TestQuestion(
            test_id=test.id, sort_order=i, question=q,
            choice1=choices[0][0], choice1_code=choices[0][1],
            choice2=choices[1][0], choice2_code=choices[1][1],
            choice3=choices[2][0] if len(choices) > 2 else None,
            choice3_code=choices[2][1] if len(choices) > 2 else None,
        ))

    # 결과: 코드별 upsert (삭제하지 않아 result_id 보존)
    codes = data["codes"]
    for code, r in data["results"].items():
        res = TestResult.query.filter_by(test_id=test.id, code=code).first()
        if not res:
            res = TestResult(test_id=test.id, code=code)
            db.session.add(res)
        res.title = r["title"]
        res.catchphrase = r.get("catch")
        res.description = r["desc"]
        res.match_code = r.get("match")
        res.clash_code = r.get("clash")
        res.avatar_no = codes[code][1]

    db.session.commit()
    return test


def score(answer_codes, valid_codes, tiebreak) -> str | None:
    """유형 집계형: 최다 선택 유형, 동점 시 tiebreak 우선순위."""
    tally = Counter(c for c in answer_codes if c in valid_codes)
    if not tally:
        return None
    top = max(tally.values())
    tied = [c for c, n in tally.items() if n == top]
    if len(tied) == 1:
        return tied[0]
    for c in tiebreak:
        if c in tied:
            return c
    return sorted(tied)[0]
