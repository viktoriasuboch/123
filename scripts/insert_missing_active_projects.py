"""
Insert the 23 missing active projects from Planning 2026 sheet.
Already in DB (active): Next Street, Compassly, Heretic | Arcade Studio, HAYS, RWE, Colorado innovations - TRACER LLC
29 total active = 6 existing + 23 new below.
"""
import requests

SUPABASE_URL = "https://gjvycaypmlabsgvlpnlf.supabase.co"
SUPABASE_KEY = "sb_publishable_CIz_t-Ty1_yvcqCvgI9KMg_ZuNCjKjR"
H = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Each entry: (name, start_date_or_None, notes)
PROJECTS = [
    # Row 4 – Ilia Stakhno runs this (active version of HHHMust family)
    ("HHH/MUSL/OOTEM",           "2022-05-01",  "Responsible: Ilia Stakhno | USA"),
    # Row 6 – Paired App / Kyle
    ("Paired App (Kyle)",         "2022-06-01",  "Responsible: Sasha / Darya Larina"),
    # Row 8 – QuoLab Technologies
    ("QuoLab Technologies",       "2024-01-01",  "Responsible: Sasha"),
    # HAYS sub-projects (Poland) – Viktor Osipov handles all of them
    ("EON (HAYS)",                "2024-08-07",  "Sub-project of HAYS | Poland"),
    ("NXP (HAYS)",                "2024-08-07",  "Sub-project of HAYS | Poland"),
    ("Fressnap (HAYS)",           "2024-08-07",  "Sub-project of HAYS | Poland"),
    ("Klockner (HAYS)",           "2024-08-07",  "Sub-project of HAYS | Poland"),
    ("Vlad K (HAYS)",             "2024-08-07",  "Sub-project of HAYS | Poland"),
    ("Optimi (HAYS)",             "2024-08-07",  "Sub-project of HAYS | Poland"),
    ("DHL (HAYS)",                "2024-08-07",  "Sub-project of HAYS | Poland"),
    ("Hitachi (HAYS)",            "2024-08-07",  "Sub-project of HAYS | Poland"),
    ("Deutsche Bank (HAYS)",      "2024-08-07",  "Sub-project of HAYS | Poland"),
    # Row 19
    ("Incite Tech",               None,          None),
    # Row 20
    ("Outcart",                   None,          None),
    # Row 22
    ("Mermaid",                   None,          None),
    # Row 24
    ("GrayStack",                 None,          None),
    # Row 25
    ("Fox-nft-yield (Crypto)",    None,          None),
    # Row 26
    ("Pronto Books",              None,          None),
    # Row 27
    ("VERC",                      None,          None),
    # Row 28
    ("TZ Zone",                   None,          None),
    # Row 29
    ("1once",                     None,          None),
    # Row 30
    ("Saudi Payment Gateway",     None,          None),
    # Row 31
    ("Metricus",                  None,          None),
]


def insert(table, payload):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", json=payload, headers=H)
    if r.status_code not in (200, 201):
        print(f"  ERROR {r.status_code}: {r.text[:300]}")
        return None
    return r.json()


def main():
    print("=== Inserting 23 missing active projects ===\n")
    count = 0
    for name, start_date, notes in PROJECTS:
        payload = {"name": name, "status": "active"}
        if start_date:
            payload["start_date"] = start_date
        if notes:
            payload["notes"] = notes
        res = insert("projects", payload)
        if res:
            pid = res[0]["id"]
            print(f"  ✓ {name}  id={pid}")
            count += 1
            insert("project_events", {
                "project_id": pid,
                "event_type": "note",
                "description": "Данные импортированы из Planning 2026 (Active Projects)",
            })
        else:
            print(f"  ✗ FAILED: {name}")

    print(f"\nDone. Inserted {count}/23 projects.")
    print("Total active projects in DB should now be 6 (existing) + 23 (new) = 29.")


if __name__ == "__main__":
    main()
