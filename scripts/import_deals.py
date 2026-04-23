"""
Import deals (SQL or Closed) from Excel/CSV into Supabase `deals` table.

Usage:
  python scripts/import_deals.py <file> [deal_type]
  deal_type: "sql" (default) or "closed"

Expected columns (flexible, matched by keyword):
  project / client / клиент / проект
  leadgen / лидген / name
  month / месяц
  year / год          (optional — inferred from month if missing)
  bonus / бонус / сумма
  revenue / выручка   (optional)
  comment / комментарий (optional)

Rows are INSERT (not upsert) — duplicates get new IDs.
Re-running on the same file will create duplicates; check before importing.
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
MONTH_YEAR = {
    "Январь": 2026, "Февраль": 2026, "Март": 2026,
    "Апрель": 2026, "Май": 2026, "Июнь": 2026,
    "Июль": 2026, "Август": 2026,
    "Сентябрь": 2025, "Октябрь": 2025, "Ноябрь": 2025, "Декабрь": 2025,
}

def normalize_month(val) -> tuple[str | None, int]:
    if not isinstance(val, str):
        return None, 2026
    low = val.strip().lower()[:3]
    name = MONTH_MAP.get(low)
    year = MONTH_YEAR.get(name, 2026) if name else 2026
    # detect year suffix: "Апрель 2026"
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
        print("Usage: python scripts/import_deals.py <file> [sql|closed]")
        sys.exit(1)

    deal_type = sys.argv[2] if len(sys.argv) > 2 else "sql"
    if deal_type not in ("sql", "closed"):
        print("deal_type must be 'sql' or 'closed'")
        sys.exit(1)

    df = pd.read_excel(path) if path.suffix in (".xlsx", ".xls") else pd.read_csv(path)
    cols = df.columns.tolist()

    c_project = find_col(cols, "project", "client", "клиент", "проект")
    c_leadgen = find_col(cols, "leadgen", "лидген", "name", "имя")
    c_month   = find_col(cols, "month", "месяц")
    c_year    = find_col(cols, "year", "год")
    c_bonus   = find_col(cols, "bonus", "бонус", "сумма", "amount")
    c_revenue = find_col(cols, "revenue", "выручка", "rev")
    c_comment = find_col(cols, "comment", "комментарий", "note")

    if not all([c_project, c_leadgen, c_month, c_bonus]):
        print(f"Could not find required columns. Found: {cols}")
        sys.exit(1)

    rows = []
    for _, r in df.iterrows():
        project = str(r[c_project]).strip() if pd.notna(r[c_project]) else ""
        leadgen = str(r[c_leadgen]).strip() if pd.notna(r[c_leadgen]) else ""
        month_raw = str(r[c_month]).strip() if pd.notna(r[c_month]) else ""
        bonus = pd.to_numeric(r[c_bonus], errors="coerce")

        if not project or not leadgen or not month_raw or pd.isna(bonus):
            continue

        month, inferred_year = normalize_month(month_raw)
        if not month:
            print(f"  Skipping unknown month: {month_raw!r}")
            continue

        year = int(r[c_year]) if c_year and pd.notna(r[c_year]) else inferred_year
        revenue = pd.to_numeric(r[c_revenue], errors="coerce") if c_revenue else None
        comment = str(r[c_comment]).strip() if c_comment and pd.notna(r[c_comment]) else ""

        rows.append({
            "project": project,
            "leadgen": leadgen,
            "month": month,
            "year": year,
            "bonus": float(bonus),
            "revenue": float(revenue) if pd.notna(revenue) else None,
            "comment": comment or None,
            "deal_type": deal_type,
        })

    print(f"Parsed {len(rows)} deals (type={deal_type})")
    if not rows:
        return

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/deals",
        json=rows,
        headers=HEADERS,
    )
    if resp.status_code not in (200, 201):
        print(f"ERROR {resp.status_code}: {resp.text}")
    else:
        print(f"OK — inserted {len(rows)} deals")

if __name__ == "__main__":
    main()
