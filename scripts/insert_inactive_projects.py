"""
Insert Inactive Projects from Resource Management 2026 → Inactive Projects sheet.
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

PROJECTS = [
    {"name": "HHHMust",         "start_date": "2020-05-01", "status": "completed",
     "notes": "Responsible: Stakho Ilia | USA | 18+ контент, невозможно размещать рекламу и монетизировать продукт"},
    {"name": "Morewards",       "start_date": "2020-05-01", "status": "completed",
     "notes": "Responsible: Stakho Ilia | USA | Поднимает инвестиции"},
    {"name": "Gmartification",  "start_date": "2024-08-01", "status": "completed",
     "notes": "Responsible: Liza S / Stakho Ilia | Нет бюджета"},
    {"name": "15 SOF + 20/19",  "start_date": "2024-08-01", "status": "completed",
     "notes": "Responsible: Liza S / Elen K | USA | Закончился бюджет"},
    {"name": "Fortune-app",     "start_date": None,          "status": "completed",
     "notes": "Responsible: Liza S"},
    {"name": "CSS",             "start_date": None,          "status": "completed",
     "notes": "Responsible: Liza S"},
    {"name": "qda.life",        "start_date": None,          "status": "completed",
     "notes": "Responsible: Liza S"},
    {"name": "Fave Page",       "start_date": None,          "status": "completed",
     "notes": "Responsible: Liza S"},
    {"name": "PetPal",          "start_date": None,          "status": "completed",
     "notes": "Responsible: Liza S"},
    {"name": "SPB",             "start_date": None,          "status": "completed",
     "notes": "Responsible: Liza S / Elen K | USA | Закончился бюджет"},
]

MEMBERS = {
    "HHHMust": [
        ("PM",  "Stakho Ilia",        "staff",      20.63, 42, 160, None),
        ("QA",  "Panou Veniamin",     "staff",      18.75, 42, 160, None),
        ("Dev", "Filonova Valeriya",  "staff",       6.88, 52, 160, None),
        ("Dev", "Ivan Gul",           "freelancer", 20.00, 52, 160, None),
    ],
    "Morewards": [
        ("PM",       "Stakho Ilia",       "staff",      20.63, 45, 160, None),
        ("Designer", "Vasenina Elena",    "staff",      10.00, 39, 160, None),
        ("QA",       "Yankovich Arina",   "staff",       7.50, 35, 160, None),
        ("Dev",      "Ivan Gul",          "staff",      20.00, 45, 160, None),
        ("Dev",      "Vladislav Temriuk", "staff",      25.00, 50, 160, None),
        ("Dev",      "Vihareva Ekaterina","staff",       5.00, 45, 160, None),
    ],
    "Gmartification": [
        ("PM",     "Stakho Ilia",       "staff",      20.63, 43, 160, None),
        ("BA",     "Thomirov Roman",    "staff",      20.00, 40, 160, None),
        ("Designer","Vasenina Elena",   "freelancer", 10.00, 40, 160, None),
        ("QA",     "Panou Veniamin",    "staff",      15.63, 35, 160, None),
        ("Dev",    "Yurkevich Mikalai", "staff",      19.38, 55, 160, None),
        ("Dev",    "Yan Marinich",      "staff",      25.00, 55, 160, None),
        ("DevOps", "Dzianis Babich",    "freelancer", 26.00, 65, 160, None),
    ],
    "15 SOF + 20/19": [
        ("PM",  "Elena Koschaeva",  "staff",      28.13, 50, 160, None),
        ("BA",  "Thomirov Roman",   "staff",      20.00, 40, 160, None),
        ("Dev", "Dmitriy Lapunov",  "staff",      38.75, 65, 160, None),
    ],
    "Fortune-app": [
        ("Dev", "Manukov Vladislav", "staff", 4.69, 22, 160, None),
    ],
    "CSS": [
        ("Dev", "Manukov Vladislav", "staff", 4.69, 35, 160, None),
    ],
    "qda.life": [
        ("Elixir Developer", "Vladimir Sinitsyn", "freelancer", 25.00, 50, 160, None),
    ],
    "Fave Page": [
        ("Dev", "Victor Kiraydt",    "staff",      28.00, 55, 160, None),
        ("Dev", "Manukov Vladislav", "staff",       5.00, 55, 160, None),
    ],
    "PetPal": [
        ("Designer", "Veronica Makhankova", "staff", 2.81, 35, 160, None),
    ],
    "SPB": [
        ("PM",       "Elena Koschaeva",   "staff",      28.13, 41, 160, None),
        ("BA",       "Yulia Soiko",       "staff",      15.26, 41, 160, None),
        ("Designer", "Maria Izokh",       "staff",       6.25, 41, 160, None),
        ("QA",       "Panou Veniamin",    "staff",      18.75, 41, 160, None),
        ("Dev",      "Ivan Gul",          "freelancer", 20.00, 41, 160, None),
        ("Dev",      "Vladislav Manukov", "staff",       4.69, 41, 160, None),
    ],
}


def insert(table, payload):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", json=payload, headers=H)
    if r.status_code not in (200, 201):
        print(f"  ERROR {r.status_code}: {r.text[:300]}")
        return None
    return r.json()


def main():
    proj_ids = {}

    print("=== Inserting inactive projects ===")
    for p in PROJECTS:
        data = {k: v for k, v in p.items() if v is not None}
        res = insert("projects", data)
        if res:
            pid = res[0]["id"]
            proj_ids[p["name"]] = pid
            print(f"  ✓ {p['name']}  id={pid}")

    print("\n=== Inserting members ===")
    for proj_name, members in MEMBERS.items():
        pid = proj_ids.get(proj_name)
        if not pid:
            print(f"  SKIP: {proj_name}")
            continue
        rows = []
        for role, dev_name, emp_type, buy_rate, sell_rate, hours_load, dev_start in members:
            salary = round(buy_rate * 160, 2) if emp_type == "staff" else 0
            rows.append({
                "project_id": pid, "dev_name": dev_name, "role": role,
                "employment_type": emp_type, "buy_rate": buy_rate,
                "sell_rate": sell_rate, "salary": salary,
                "hours_load": hours_load, "dev_start_date": dev_start,
                "is_active": False,
            })
        res = insert("project_members", rows)
        if res:
            print(f"  ✓ {proj_name}: {len(res)} members")

        insert("project_events", {
            "project_id": pid, "event_type": "note",
            "description": "Данные импортированы из Inactive Projects (Resource Management 2026)",
        })

    print("\nDone.")


if __name__ == "__main__":
    main()
