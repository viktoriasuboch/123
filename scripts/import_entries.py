"""
Import bonus entries from Excel/CSV into Supabase `entries` table.
Links entries to people by name (inserts person if not found).

Usage:
  python scripts/import_entries.py <file> [sheet_name]

Expected columns (flexible):
  name / имя / person / сотрудник       — person name
  month / месяц                          — month (RU or EN)
  year / год                             (optional — inferred from month)
  category / cat / категория             — closed/calls/special/mentoring/other
  entry_name / запись / description      — entry label
  bonus / бонус / сумма                  — amount
  comment / комментарий                  (optional)

Category aliases accepted:
  "закрыт", "sql", "closed" → closed
  "звонк", "call", "mql"    → calls
  "special", "спец"         → special
  "ментор", "mentor"        → mentoring
  anything else             → other
"""

import sys
import re
import pandas as pd
import requests
from pathlib import Path

SUPABASE_URL = "https://gjvycaypmlabsgvlpnlf.supabase.co"
SUPABASE_KEY = "sb_publishable_CIz_t-Ty1_yvcqCvgI9KMg_ZuNCjKjR"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

MONTH_MAP = {
    "янв": "Январь", "фев": "Февраль", "мар": "Март",
    "апр": "Апрель", "май": "Май", "июн": "Июнь",
    "июл": "Июль", "авг": "Август",
    "сен": "Сентябрь", "окт": "Октябрь", "ноя": "Ноябрь", "дек": "Декабрь",
    "jan": "Январь", "feb": "Февраль", "mar": "Март",
    "apr": "Апрель", "may": "Май", "jun": "Июнь",
    "jul": "Июль", "aug": "Август",
    "sep": "Сентябрь", "oct": "Октябрь", "nov": "Ноябрь", "dec": "Декабрь",
}
MONTH_YEAR_DEFAULT = {
    "Сентябрь": 2025, "Октябрь": 2025, "Ноябрь": 2025, "Декабрь": 2025,
}

def normalize_month(val):
    if not isinstance(val, str):
        return None, 2026
    low = val.strip().lower()[:3]
    name = MONTH_MAP.get(low)
    year = MONTH_YEAR_DEFAULT.get(name, 2026)
    m = re.search(r"20(\d\d)", val)
    if m:
        year = int("20" + m.group(1))
    return name, year

def normalize_cat(val):
    if not isinstance(val, str):
        return "other"
    low = val.lower()
    if any(k in low for k in ("закрыт", "sql", "closed")):
        return "closed"
    if any(k in low for k in ("звонк", "call", "mql")):
        return "calls"
    if any(k in low for k in ("special", "спец")):
        return "special"
    if any(k in low for k in ("ментор", "mentor")):
        return "mentoring"
    return "other"

def find_col(cols, *keywords):
    for kw in keywords:
        for c in cols:
            if kw.lower() in str(c).lower():
                return c
    return None

def get_or_create_person(name: str, people_cache: dict) -> str:
    if name in people_cache:
        return people_cache[name]
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/people?name=eq.{requests.utils.quote(name)}&select=id",
        headers=HEADERS,
    )
    data = resp.json()
    if data:
        pid = data[0]["id"]
    else:
        sort_order = len(people_cache) + 100
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/people",
            json=[{"name": name, "sort_order": sort_order}],
            headers=HEADERS,
        )
        pid = r.json()[0]["id"]
        print(f"  Created person: {name} ({pid})")
    people_cache[name] = pid
    return pid

def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not path or not path.exists():
        print("Usage: python scripts/import_entries.py <file> [sheet]")
        sys.exit(1)

    target_sheet = sys.argv[2] if len(sys.argv) > 2 else None

    xl = pd.ExcelFile(path) if path.suffix in (".xlsx", ".xls") else None
    sheets = xl.sheet_names if xl else [None]

    people_cache = {}

    for sheet in sheets:
        if target_sheet and sheet != target_sheet:
            continue
        df = xl.parse(sheet) if xl else pd.read_csv(path)
        cols = df.columns.tolist()
        print(f"\nSheet: {sheet or path.name} | columns: {cols}")

        c_person  = find_col(cols, "name", "имя", "person", "сотрудник")
        c_month   = find_col(cols, "month", "месяц")
        c_year    = find_col(cols, "year", "год")
        c_cat     = find_col(cols, "cat", "category", "категория", "тип")
        c_entry   = find_col(cols, "entry", "запись", "description", "label", "за что")
        c_bonus   = find_col(cols, "bonus", "бонус", "сумма", "amount")
        c_comment = find_col(cols, "comment", "комментарий", "note")

        if not all([c_person, c_month, c_bonus]):
            print(f"  Missing required columns, skipping. Found: {cols}")
            continue

        rows = []
        for _, r in df.iterrows():
            person_name = str(r[c_person]).strip() if pd.notna(r[c_person]) else ""
            month_raw   = str(r[c_month]).strip() if pd.notna(r[c_month]) else ""
            bonus       = pd.to_numeric(r[c_bonus], errors="coerce")

            if not person_name or not month_raw or pd.isna(bonus):
                continue

            month, inferred_year = normalize_month(month_raw)
            if not month:
                print(f"  Unknown month: {month_raw!r}, skipping row")
                continue

            year    = int(r[c_year]) if c_year and pd.notna(r[c_year]) else inferred_year
            cat     = normalize_cat(r[c_cat]) if c_cat else "other"
            entry_n = str(r[c_entry]).strip() if c_entry and pd.notna(r[c_entry]) else month
            comment = str(r[c_comment]).strip() if c_comment and pd.notna(r[c_comment]) else ""

            person_id = get_or_create_person(person_name, people_cache)
            rows.append({
                "person_id": person_id,
                "month": month,
                "year": year,
                "cat": cat,
                "name": entry_n,
                "bonus": float(bonus),
                "comment": comment or None,
                "sort_order": len(rows),
            })

        print(f"  Parsed {len(rows)} entries")
        if not rows:
            continue

        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/entries",
            json=rows,
            headers={**HEADERS, "Prefer": "return=minimal"},
        )
        if resp.status_code not in (200, 201):
            print(f"  ERROR {resp.status_code}: {resp.text}")
        else:
            print(f"  OK — inserted {len(rows)} entries")

if __name__ == "__main__":
    main()
