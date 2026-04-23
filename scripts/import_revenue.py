"""
Import project revenue data from Excel/CSV into Supabase `project_revenues` table.

Usage:
  python scripts/import_revenue.py <file> [sheet_name]

Expected columns (flexible, matched by keyword):
  project / client / клиент / проект   — project name
  month / месяц                         — month (RU or EN, e.g. "Январь", "Jan", "апрель 2026")
  year / год                            (optional — inferred from month if contains year)
  amount / revenue / сумма / выручка    — revenue amount
  note / заметка / comment             (optional)

Re-running on the same file will insert duplicates — check before importing.
To avoid duplicates, delete existing rows for those months first via Supabase dashboard.
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

def find_col(cols, *keywords):
    for kw in keywords:
        for c in cols:
            if kw.lower() in str(c).lower():
                return c
    return None

def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not path or not path.exists():
        print("Usage: python scripts/import_revenue.py <file> [sheet]")
        sys.exit(1)

    target_sheet = sys.argv[2] if len(sys.argv) > 2 else None
    xl = pd.ExcelFile(path) if path.suffix in (".xlsx", ".xls") else None
    sheets = xl.sheet_names if xl else [None]

    for sheet in sheets:
        if target_sheet and sheet != target_sheet:
            continue
        df = xl.parse(sheet) if xl else pd.read_csv(path)
        cols = df.columns.tolist()
        print(f"\nSheet: {sheet or path.name} | columns: {cols}")

        c_project = find_col(cols, "project", "client", "клиент", "проект")
        c_month   = find_col(cols, "month", "месяц")
        c_year    = find_col(cols, "year", "год")
        c_amount  = find_col(cols, "amount", "revenue", "сумма", "выручка")
        c_note    = find_col(cols, "note", "заметка", "comment")

        if not all([c_project, c_month, c_amount]):
            print(f"  Missing required columns. Found: {cols}")
            continue

        rows = []
        for _, r in df.iterrows():
            project   = str(r[c_project]).strip() if pd.notna(r[c_project]) else ""
            month_raw = str(r[c_month]).strip() if pd.notna(r[c_month]) else ""
            amount    = pd.to_numeric(r[c_amount], errors="coerce")

            if not project or not month_raw or pd.isna(amount):
                continue

            month, inferred_year = normalize_month(month_raw)
            if not month:
                print(f"  Unknown month: {month_raw!r}, skipping")
                continue

            year = int(r[c_year]) if c_year and pd.notna(r[c_year]) else inferred_year
            note = str(r[c_note]).strip() if c_note and pd.notna(r[c_note]) else ""

            rows.append({
                "project_name": project,
                "month": month,
                "year": year,
                "amount": float(amount),
                "note": note or None,
            })

        print(f"  Parsed {len(rows)} revenue rows")
        if not rows:
            continue

        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/project_revenues",
            json=rows,
            headers=HEADERS,
        )
        if resp.status_code not in (200, 201):
            print(f"  ERROR {resp.status_code}: {resp.text}")
        else:
            print(f"  OK — inserted {len(rows)} rows")

if __name__ == "__main__":
    main()
