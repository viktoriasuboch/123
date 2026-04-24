"""
Insert project revenue data (Jan-Apr 2026) read from Cashflow/Invoicing Google Sheet.
Fact column values only (actual received amounts).
"""
import requests

SUPABASE_URL = "https://gjvycaypmlabsgvlpnlf.supabase.co"
SUPABASE_KEY = "sb_publishable_CIz_t-Ty1_yvcqCvgI9KMg_ZuNCjKjR"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# Revenue data: (project_name, month_ru, year, amount)
# Fact column values from Cashflow tab, Jan-Apr 2026
ROWS = [
    # Crimson/Ryan/ Compassiy
    ("Crimson/Ryan/ Compassiy", "Январь",  2026, 102210),
    ("Crimson/Ryan/ Compassiy", "Февраль", 2026, 94120),
    ("Crimson/Ryan/ Compassiy", "Март",    2026, 96810),
    ("Crimson/Ryan/ Compassiy", "Апрель",  2026, 113130),

    # NextStreet
    ("NextStreet", "Январь",  2026, 47640),
    ("NextStreet", "Февраль", 2026, 44705),
    ("NextStreet", "Март",    2026, 48530),
    ("NextStreet", "Апрель",  2026, 61020),

    # Arcade Studio
    ("Arcade Studio", "Январь",  2026, 21160),
    ("Arcade Studio", "Февраль", 2026, 23010),
    ("Arcade Studio", "Март",    2026, 17010),

    # QuoLab Technologies, Inc.
    ("QuoLab Technologies, Inc.", "Январь",  2026, 6400),
    ("QuoLab Technologies, Inc.", "Февраль", 2026, 8000),
    ("QuoLab Technologies, Inc.", "Март",    2026, 8000),
    ("QuoLab Technologies, Inc.", "Апрель",  2026, 8000),

    # HAYS VIKTOR
    ("HAYS VIKTOR", "Январь",  2026, 6510),
    ("HAYS VIKTOR", "Февраль", 2026, 11064),
    ("HAYS VIKTOR", "Март",    2026, 7364),
    ("HAYS VIKTOR", "Апрель",  2026, 5472),

    # EON ( HAYS)
    ("EON ( HAYS)", "Январь",  2026, 14470),
    ("EON ( HAYS)", "Февраль", 2026, 11273),
    ("EON ( HAYS)", "Март",    2026, 11273),

    # NXP ( HAYS)
    ("NXP ( HAYS)", "Январь",  2026, 7616),
    ("NXP ( HAYS)", "Февраль", 2026, 5664),
    ("NXP ( HAYS)", "Март",    2026, 6655),
    ("NXP ( HAYS)", "Апрель",  2026, 5500),

    # Fressnap( HAYS)
    ("Fressnap( HAYS)", "Январь",  2026, 5260),
    ("Fressnap( HAYS)", "Февраль", 2026, 4602),
    ("Fressnap( HAYS)", "Март",    2026, 5775),
    ("Fressnap( HAYS)", "Апрель",  2026, 4000),

    # Klockner (HAYS)
    ("Klockner (HAYS)", "Январь",  2026, 7875),
    ("Klockner (HAYS)", "Февраль", 2026, 7810),
    ("Klockner (HAYS)", "Март",    2026, 6183),
    ("Klockner (HAYS)", "Апрель",  2026, 6300),

    # Vlad K ( HAYS)
    ("Vlad K ( HAYS)", "Январь",  2026, 6584),
    ("Vlad K ( HAYS)", "Февраль", 2026, 2564),
    ("Vlad K ( HAYS)", "Март",    2026, 7400),
    ("Vlad K ( HAYS)", "Апрель",  2026, 3000),

    # Optimi (HAYS)
    ("Optimi (HAYS)", "Январь",  2026, 3469),
    ("Optimi (HAYS)", "Февраль", 2026, 6000),
    ("Optimi (HAYS)", "Март",    2026, 7400),
    ("Optimi (HAYS)", "Апрель",  2026, 3000),

    # DHL ( HAYS)
    ("DHL ( HAYS)", "Февраль", 2026, 6880),
    ("DHL ( HAYS)", "Март",    2026, 6727),
    ("DHL ( HAYS)", "Апрель",  2026, 6000),

    # Outcart
    ("Outcart", "Январь",  2026, 5575),
    ("Outcart", "Февраль", 2026, 925),

    # RWE
    ("RWE", "Январь",  2026, 7425),
    ("RWE", "Февраль", 2026, 5285),
    ("RWE", "Март",    2026, 6470),
    ("RWE", "Апрель",  2026, 5300),

    # Mermaid
    ("Mermaid", "Январь",  2026, 14915),
    ("Mermaid", "Февраль", 2026, 29969),
    ("Mermaid", "Март",    2026, 15653),
    ("Mermaid", "Апрель",  2026, 15800),

    # Colorado
    ("Colorado", "Январь",  2026, 45368),
    ("Colorado", "Февраль", 2026, 16640),
    ("Colorado", "Март",    2026, 32480),
    ("Colorado", "Апрель",  2026, 39680),

    # GrayStack
    ("GrayStack", "Январь",  2026, 3200),
    ("GrayStack", "Февраль", 2026, 3200),
    ("GrayStack", "Март",    2026, 6400),
    ("GrayStack", "Апрель",  2026, 6400),

    # Fox-nft-yield (Crypto)
    ("Fox-nft-yield (Crypto)", "Январь",  2026, 20400),
    ("Fox-nft-yield (Crypto)", "Февраль", 2026, 14000),
    ("Fox-nft-yield (Crypto)", "Март",    2026, 26000),
    ("Fox-nft-yield (Crypto)", "Апрель",  2026, 16400),

    # Pronto Books
    ("Pronto Books", "Февраль", 2026, 3200),
    ("Pronto Books", "Март",    2026, 6400),
    ("Pronto Books", "Апрель",  2026, 6400),

    # VERC
    ("VERC", "Февраль", 2026, 5637),
    ("VERC", "Март",    2026, 4620),
    ("VERC", "Апрель",  2026, 1980),

    # TZ Zone
    ("TZ Zone", "Февраль", 2026, 1000),
    ("TZ Zone", "Март",    2026, 3000),

    # Metricus
    ("Metricus", "Январь",  2026, 22150),
    ("Metricus", "Февраль", 2026, 77940),
    ("Metricus", "Март",    2026, 50460),
    ("Metricus", "Апрель",  2026, 25490),

    # Nikko Industries/ STL Body / Printpal
    ("Nikko Industries/ STL Body / Printpal", "Январь",  2026, 1908),
    ("Nikko Industries/ STL Body / Printpal", "Февраль", 2026, 2592),
    ("Nikko Industries/ STL Body / Printpal", "Март",    2026, 6336),
    ("Nikko Industries/ STL Body / Printpal", "Апрель",  2026, 1000),

    # Svetness
    ("Svetness", "Январь",  2026, 14680),

    # ORIA
    ("ORIA", "Январь",  2026, 4900),
    ("ORIA", "Февраль", 2026, 6100),
    ("ORIA", "Март",    2026, 3650),
    ("ORIA", "Апрель",  2026, 7300),

    # PRIME
    ("PRIME", "Январь",  2026, 2500),
    ("PRIME", "Февраль", 2026, 2500),

    # Plain ID
    ("Plain ID", "Февраль", 2026, 2800),
    ("Plain ID", "Март",    2026, 8000),
    ("Plain ID", "Апрель",  2026, 7160),

    # Privat Parts
    ("Privat Parts", "Февраль", 2026, 1600),
    ("Privat Parts", "Март",    2026, 4500),

    # SparkDX
    ("SparkDX", "Март",   2026, 4785),
    ("SparkDX", "Апрель", 2026, 3826),

    # Island DB
    ("Island DB", "Март",   2026, 2800),
    ("Island DB", "Апрель", 2026, 1400),

    # Rowte
    ("Rowte", "Январь",  2026, 13800),
    ("Rowte", "Февраль", 2026, 7400),
    ("Rowte", "Март",    2026, 8960),

    # Kamal ADCR
    ("Kamal ADCR", "Январь",  2026, 3500),
    ("Kamal ADCR", "Февраль", 2026, 3500),
    ("Kamal ADCR", "Март",    2026, 3500),
]

def main():
    payload = [
        {"project_name": p, "month": m, "year": y, "amount": a}
        for p, m, y, a in ROWS
    ]
    print(f"Inserting {len(payload)} revenue rows...")
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/project_revenues",
        json=payload,
        headers=HEADERS,
    )
    if resp.status_code not in (200, 201):
        print(f"ERROR {resp.status_code}: {resp.text}")
    else:
        print(f"OK — inserted {len(payload)} rows")

if __name__ == "__main__":
    main()
