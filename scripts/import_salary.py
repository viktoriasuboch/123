"""
Import salary data from Excel into Supabase `salaries` table.

Usage:
  python scripts/import_salary.py <path_to_excel> [sheet_name]

Sheet format expected:
  Rows grouped by month header (e.g. "СЕНТЯБРЬ" / "ЯНВАРЬ").
  Each data row: Name | ... | FIX GROSS | ... | К выплате

The script auto-detects year from month name:
  Sep-Dec → 2025 (or overridden by YEAR_FOR_MONTHS below)
  Jan-Dec → year derived from sheet name or fallback

Edit YEAR_OVERRIDE at the top if a sheet covers a specific year.
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
    "Prefer": "resolution=merge-duplicates",
}

LEADGEN_NAMES = {
    "anna", "anya", "maria", "masha", "ksenia", "ksyusha",
    "natallia", "natalia", "aleksandra", "sasha", "nikita",
    "polina", "katerina", "katya", "daria", "dasha", "artem",
}

MONTH_RU = {
    "январь": ("Январь", 1), "февраль": ("Февраль", 2),
    "март": ("Март", 3), "апрель": ("Апрель", 4),
    "май": ("Май", 5), "июнь": ("Июнь", 6),
    "июль": ("Июль", 7), "август": ("Август", 8),
    "сентябрь": ("Сентябрь", 9), "октябрь": ("Октябрь", 10),
    "ноябрь": ("Ноябрь", 11), "декабрь": ("Декабрь", 12),
}

def guess_year_from_sheet(sheet_name: str) -> int:
    m = re.search(r"20\d\d", sheet_name)
    return int(m.group()) if m else 2026

def is_leadgen_row(name: str) -> bool:
    if not isinstance(name, str):
        return False
    first = name.strip().split()[0].lower().rstrip(".,;")
    return first in LEADGEN_NAMES

def parse_sheet(df: pd.DataFrame, default_year: int) -> list[dict]:
    records = []
    current_month = None
    current_month_num = None
    seen_months = set()

    for _, row in df.iterrows():
        first_cell = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
        low = first_cell.lower().split("(")[0].strip().rstrip(" ·-—")

        if low in MONTH_RU:
            name_ru, mnum = MONTH_RU[low]
            if name_ru in seen_months:
                continue  # skip duplicate month headers (e.g. "март (оплата в апреле)")
            seen_months.add(name_ru)
            current_month = name_ru
            current_month_num = mnum
            continue

        if current_month is None:
            continue

        name = first_cell
        if not is_leadgen_row(name):
            continue

        vals = [pd.to_numeric(c, errors="coerce") for c in row.iloc[1:]]
        nums = [v for v in vals if pd.notna(v) and v > 0]
        if len(nums) < 2:
            continue

        gross = max(nums)
        total = sum(nums[-2:]) if len(nums) >= 2 else nums[-1]

        records.append({
            "leadgen_name": name.strip(),
            "month": current_month,
            "month_num": current_month_num,
            "year": default_year,
            "gross": float(gross),
            "total": float(total),
        })

    # deduplicate: same name+month → gross=max, total=sum
    deduped = {}
    for r in records:
        k = (r["leadgen_name"], r["month"], r["year"])
        if k not in deduped:
            deduped[k] = r.copy()
        else:
            deduped[k]["gross"] = max(deduped[k]["gross"], r["gross"])
            deduped[k]["total"] += r["total"]

    return list(deduped.values())


def upsert(rows: list[dict]):
    payload = [{
        "leadgen_name": r["leadgen_name"],
        "month": r["month"],
        "month_num": r["month_num"],
        "year": r["year"],
        "gross": r["gross"],
        "total": r["total"],
    } for r in rows]
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/salaries",
        json=payload,
        headers=HEADERS,
    )
    if resp.status_code not in (200, 201):
        print(f"  ERROR {resp.status_code}: {resp.text}")
    else:
        print(f"  OK — upserted {len(payload)} rows")


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not path or not path.exists():
        print("Usage: python scripts/import_salary.py <excel_file> [sheet_name]")
        sys.exit(1)

    target_sheet = sys.argv[2] if len(sys.argv) > 2 else None
    xl = pd.ExcelFile(path)

    for sheet in xl.sheet_names:
        if target_sheet and sheet != target_sheet:
            continue
        print(f"\nSheet: {sheet}")
        year = guess_year_from_sheet(sheet)
        print(f"  Detected year: {year}")
        df = xl.parse(sheet, header=None)
        rows = parse_sheet(df, year)
        print(f"  Parsed {len(rows)} salary rows")
        if rows:
            upsert(rows)

if __name__ == "__main__":
    main()
