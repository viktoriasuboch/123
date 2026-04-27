"""
Insert Active Projects data from Resource Management 2026 sheet.
IH = staff (buy_rate = salary/160), FL = freelancer.
hours_load = hours_per_day * 20 (working days/month).
"""
import requests, json

SUPABASE_URL = "https://gjvycaypmlabsgvlpnlf.supabase.co"
SUPABASE_KEY = "sb_publishable_CIz_t-Ty1_yvcqCvgI9KMg_ZuNCjKjR"
H = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# ─────────────────────────────────────────────────────────────
# PROJECTS
# ─────────────────────────────────────────────────────────────
PROJECTS = [
    {"name": "Next Street",                      "start_date": "2022-06-01", "status": "active", "notes": "Responsible: Elena K | USA"},
    {"name": "Compassly",                         "start_date": "2022-06-01", "status": "active", "notes": "Responsible: Zayats Tatsiana | USA"},
    {"name": "Heretic | Arcade Studio",           "start_date": "2023-11-17", "status": "active", "notes": "Responsible: Liza S | USA"},
    {"name": "HAYS",                              "start_date": "2024-08-07", "status": "active", "notes": "Responsible: Liza S | Poland"},
    {"name": "RWE",                               "start_date": "2024-11-04", "status": "active", "notes": "Responsible: Liza S | Poland"},
    {"name": "Colorado innovations - TRACER LLC", "start_date": "2025-03-20", "status": "active", "notes": "Responsible: Liza S | Dubai"},
]

# ─────────────────────────────────────────────────────────────
# MEMBERS per project name
# Fields: role, dev_name, employment_type, buy_rate, sell_rate,
#         hours_load (per month), dev_start_date, comment
# IH → staff, salary = buy_rate * 160
# FL → freelancer, salary = 0
# hours/day: 8→160, 4→80, 2→40
# ─────────────────────────────────────────────────────────────
MEMBERS = {
    "Next Street": [
        ("PM",     "Elena Koschaeva",     "staff",      28.13, 50,  40,  None, None),
        ("QA",     "Arina Yankovich",     "staff",      10.00, 50,  80,  None, None),
        ("QA",     "Panou Veniamin",      "staff",      20.00, 50,  160, None, None),
        ("Dev",    "Kudravets Mikhail",   "staff",       6.25, 30,  160, None, "c 01.10.25 billib"),
        ("Dev",    "Viaryha Mikhail",     "staff",      12.50, 30,  160, None, None),
        ("Dev",    "Vladislav Romanovsky","staff",      28.00, 65,  160, None, None),
        ("Dev",    "Vrezh Babakekhian",   "staff",      18.50, 40,  160, None, None),
        ("DevOps", "Roman Krolikov",      "freelancer", 42.00, 70,  160, None, None),
    ],
    "Compassly": [
        ("PM",       "Zayats Tatsiana",      "freelancer", 15.00, 40,  160, None, None),
        ("BA",       "Julia Soiko",          "freelancer", 18.00, 40,  160, None, None),
        ("BA",       "Roman Tihomirov",      "staff",      23.75, 40,   40, None, "c 1.12 - $3800/mo"),
        ("BA",       "Natalia Prokopchuk",   "staff",      18.75, 40,  160, None, None),
        ("Designer", "Maria Izoh",           "freelancer", 12.00, 40,   80, None, "c 01.02.2026 не работает"),
        ("Designer", "Natalia Gurinovich",   "staff",       5.63, 40,   80, None, None),
        ("QA",       "Anna Korenchuk",       "staff",      16.25, 40,  160, None, None),
        ("Dev",      "Vladislav Romanovsky", "staff",      28.00, 50,   80, None, None),
        ("QA",       "Arina Yankovich",      "staff",      10.00, 40,   80, None, None),
        ("Dev",      "Dmitry Spirin",        "freelancer", 25.00, 50,  160, None, None),
        ("Dev",      "Danila Belozarovich",  "freelancer", 25.00, 55,  160, None, "c 22.10 Замена Юли"),
        ("Dev",      "Krutikov Vladislav",   "staff",      10.63, 50,  160, None, "c 1.12 - $1700/mo"),
        ("Dev",      "Onohov Alexey",        "staff",       6.00, 50,  160, None, None),
        ("Dev",      "Manukov Vladislav",    "staff",       7.00, 55,   80, None, None),
        ("Dev",      "Maksim Balashov",      "staff",       5.00, 50,  160, "2026-01-19", None),
        ("Dev",      "Ivan Karachun",        "staff",       4.38, 50,  160, "2026-01-19", None),
        ("Dev",      "Sergey Bebekh",        "staff",       5.63, 50,  160, "2026-01-19", None),
        ("Dev",      "Yurkevich Mikalai",    "staff",      24.06, 55,  160, None, None),
        ("Dev",      "Sergey Lobodin",       "staff",      19.00, 50,  160, None, None),
        ("TL",       "Yan Marinich",         "staff",      28.00, 65,  160, None, None),
    ],
    "Heretic | Arcade Studio": [
        ("Dev",              "Artsem Shauchuk", "staff",      25.00, 50, 160, None, None),
        ("BE Dev (Python)",  "Viktor",          "freelancer", 25.00, 45, 160, None, None),
        ("Data Engineer",    "Tilek Chubakov",  "freelancer", 30.00, 55, 160, None, None),
    ],
    "HAYS": [
        ("Java Developer", "Victor Osipov", "freelancer", 21.00, 44, 160, None,
         "Подняли рейт на $1/h, нужно пересмотреть на $25 (старт 4.07.2024)"),
    ],
    "RWE": [
        ("Dev", "Alieksandr", "freelancer", 20.00, 40, 160, None, None),
    ],
    "Colorado innovations - TRACER LLC": [
        ("React dev",  "Andrew Lisov", "freelancer", 15.00, 40, 160, None, None),
        ("Full Stack", "Ali Salehi",   "staff",      17.00, 40, 160, None, None),
        ("Full Stack", "Roma Savich",  "staff",       6.00, 40, 160, None, "Влад К отвечает"),
        ("Прокси",     "Vlad Proxy / Roma Savich", "freelancer", 7.00, 40, 160, None, "Продавали Влада Каратая"),
    ],
}


def insert(table, payload):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", json=payload, headers=H)
    if r.status_code not in (200, 201):
        print(f"  ERROR {r.status_code}: {r.text[:200]}")
        return None
    return r.json()


def main():
    proj_ids = {}

    # 1. Insert projects
    print("=== Inserting projects ===")
    for p in PROJECTS:
        res = insert("projects", p)
        if res:
            pid = res[0]["id"]
            proj_ids[p["name"]] = pid
            print(f"  ✓ {p['name']}  id={pid}")

    # 2. Insert members
    print("\n=== Inserting members ===")
    for proj_name, members in MEMBERS.items():
        pid = proj_ids.get(proj_name)
        if not pid:
            print(f"  SKIP (no project id): {proj_name}")
            continue
        print(f"\n  Project: {proj_name}")

        rows = []
        for role, dev_name, emp_type, buy_rate, sell_rate, hours_load, dev_start, comment in members:
            salary = round(buy_rate * 160, 2) if emp_type == "staff" else 0
            row = {
                "project_id":      pid,
                "dev_name":        dev_name,
                "role":            role,
                "employment_type": emp_type,
                "buy_rate":        buy_rate,
                "sell_rate":       sell_rate,
                "salary":          salary,
                "hours_load":      hours_load,
                "dev_start_date":  dev_start,
                "is_active":       True,
            }
            rows.append(row)

        res = insert("project_members", rows)
        if res:
            print(f"    ✓ Inserted {len(res)} members")

        # 3. Log event for each project
        ev = {
            "project_id": pid,
            "event_type":  "note",
            "description": f"Данные импортированы из Resource Management 2026 (Active Projects)",
        }
        insert("project_events", ev)

    print("\nDone.")


if __name__ == "__main__":
    main()
