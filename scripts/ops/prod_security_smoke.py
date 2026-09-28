"""PROD Security- + Production-Smoke (28.09.2026). Nur QA-Konten (A, B, TRIAL), nicht-mutierend:
Schreibversuche nur dort, wo Ablehnung erwartet wird; gelingt einer unerwartet, wird er gemeldet
und die Zeile sofort entfernt. Ausgabe ohne Tokens/Passwörter.
Aufruf: python3 scripts/ops/prod_security_smoke.py
"""
import sys, urllib.request
sys.path.insert(0, "/home/administrator/hufmanager/scripts/ops")
from qa_client import req, login

res = []
def check(name, ok, info=""):
    res.append((name, bool(ok), str(info)[:140]))
P = {"Prefer": "return=representation"}
def denied(s, b): return s in (400, 401, 403, 409) or (s in (200, 201) and b == [])

T_TOK, T = login("TRIAL")   # Provider mit Slim-Trial
A_TOK, A = login("A")       # Provider, eigener Ghost 66c99e4e
B_TOK, B = login("B")       # Provider ohne Kunden
GHOST_A = "66c99e4e-732a-4d0f-8181-efab06052083"
T_GRANT = "e9c42ec3-8381-4e3a-aef9-38ffdba910d0"   # TRIAL -> eigener Ghost dac2f06e
T_HORSE = "3ad2c166-677c-4517-b772-b7f2c1b26dd1"
FOREIGN_HORSE = "45bdf4a9-e303-42c7-8da5-b354a54629e9"  # Pferd eines Kunden eines echten Betriebs

# ── Tenant-Lesen ────────────────────────────────────────────────────────────
for name, tok, uid in (("TRIAL", T_TOK, T), ("A", A_TOK, A), ("B", B_TOK, B)):
    s, b = req("GET", "/rest/v1/services?select=provider_id", tok)
    check(f"{name}: 0 fremde Leistungen", s == 200 and all(r["provider_id"] == uid for r in b), (s, len(b) if isinstance(b, list) else b))
    s, b = req("GET", "/rest/v1/access_grants?select=provider_id,client_id", tok)
    check(f"{name}: nur eigene Grants", s == 200 and all(uid in (r["provider_id"], r["client_id"]) for r in b), (s, len(b) if isinstance(b, list) else b))
    s, b = req("GET", "/rest/v1/appointments?select=provider_id", tok)
    check(f"{name}: nur eigene Termine", s == 200 and all(r["provider_id"] == uid for r in b), (s, len(b) if isinstance(b, list) else b))
    s, b = req("GET", "/rest/v1/invoices?select=provider_id", tok)
    check(f"{name}: nur eigene Rechnungen", s == 200 and all(r["provider_id"] == uid for r in b), (s, len(b) if isinstance(b, list) else b))
    s, b = req("GET", f"/rest/v1/horses?id=eq.{FOREIGN_HORSE}&select=id", tok)
    check(f"{name}: fremdes Pferd unsichtbar", s == 200 and b == [], (s, b))

s, b = req("GET", f"/rest/v1/profiles?id=eq.{GHOST_A}&select=id", B_TOK)
check("B: Ghost-Kunde von A unsichtbar", s == 200 and b == [], (s, b))
s, b = req("GET", f"/rest/v1/profiles?id=eq.{GHOST_A}&select=id", A_TOK)
check("A: eigener Ghost-Kunde sichtbar (Positivkontrolle)", s == 200 and len(b) == 1, (s, b))

# ── Ghost-Grant / Self-Grant ────────────────────────────────────────────────
s, b = req("POST", "/rest/v1/access_grants", B_TOK, {"provider_id": B, "client_id": GHOST_A}, P)
check("B: aktiver Grant an fremden Ghost -> blockiert", denied(s, b), (s, b))
if s in (200, 201) and b: req("DELETE", f"/rest/v1/access_grants?id=eq.{b[0]['id']}", B_TOK)
s, b = req("POST", "/rest/v1/access_grants", B_TOK, {"provider_id": B, "client_id": GHOST_A, "is_active": False, "status": "pending", "can_view_medical": False}, P)
check("B: pending-Grant an fremden Ghost -> blockiert", denied(s, b), (s, b))
if s in (200, 201) and b: req("DELETE", f"/rest/v1/access_grants?id=eq.{b[0]['id']}", B_TOK)
s, b = req("PATCH", f"/rest/v1/access_grants?id=eq.{T_GRANT}", T_TOK, {"client_id": GHOST_A}, P)
check("TRIAL: eigenen Grant auf fremden Ghost umbiegen -> blockiert", denied(s, b), (s, b))
s, b = req("PATCH", f"/rest/v1/access_grants?id=eq.{T_GRANT}", T_TOK, {"client_id": A}, P)
check("TRIAL: eigenen Grant auf fremden echten Nutzer umbiegen -> blockiert", denied(s, b), (s, b))
s, b = req("GET", f"/rest/v1/access_grants?id=eq.{T_GRANT}&select=client_id,is_active", T_TOK)
check("TRIAL: eigener Grant unverändert", s == 200 and b and b[0]["client_id"].startswith("dac2f06e") and b[0]["is_active"], (s, b))

# ── Termin-Guard ────────────────────────────────────────────────────────────
s, b = req("POST", "/rest/v1/appointments?select=id", T_TOK, {"provider_id": T, "horse_id": FOREIGN_HORSE, "date": "2026-12-01", "status": "planned", "notes": "QA-0928 smoke"}, P)
check("TRIAL: Termin für fremdes Pferd -> blockiert", denied(s, b), (s, b))
if s in (200, 201) and b: req("DELETE", f"/rest/v1/appointments?id=eq.{b[0]['id']}", T_TOK)
s, b = req("POST", "/rest/v1/appointments?select=id", B_TOK, {"provider_id": T, "horse_id": T_HORSE, "date": "2026-12-01", "status": "planned", "notes": "QA-0928 smoke"}, P)
check("B: Termin im Namen von TRIAL -> blockiert", denied(s, b), (s, b))
if s in (200, 201) and b: req("DELETE", f"/rest/v1/appointments?id=eq.{b[0]['id']}", T_TOK)

# ── Edge-Functions / Auth ───────────────────────────────────────────────────
s, b = req("POST", "/functions/v1/invite-client", None, {})
check("invite-client ohne Token -> 401/410", s in (401, 410), s)
s, b = req("POST", "/functions/v1/invite-client-with-password", None, {"email": "x@example.invalid"})
check("invite-client-with-password ohne Token -> 401", s == 401, s)
s, b = req("POST", "/functions/v1/admin-create-client", T_TOK, {})
check("admin-create-client als Provider -> 401/403", s in (401, 403), s)
s, b = req("POST", "/functions/v1/create-demo-business-user", T_TOK, {})
check("create-demo-business-user -> 410", s == 410, s)
s, b = req("POST", "/functions/v1/hufi-agent", None, {"text": "x"})
check("hufi-agent ohne Token -> 401", s == 401, s)
s, b = req("POST", "/functions/v1/copecart-webhook", None, {"x": 1})
check("copecart-webhook ohne Signatur -> 401", s == 401, s)
s, b = req("GET", "/rest/v1/hm_pending_client_invites?select=id", T_TOK)
check("Invite-Tabelle für Provider gesperrt", s in (401, 403), s)
s, b = req("GET", "/rest/v1/profiles?select=id&limit=1")
check("anon liest keine Profile", s in (401, 403) or b == [], (s, b))

# ── Production-Smoke ────────────────────────────────────────────────────────
s, b = req("POST", "/rest/v1/rpc/get_hufmanager_access_context_v1", T_TOK, {})
check("TRIAL: Slim-Zugang lesbar", s == 200, (s, str(b)[:80]))
for path in ("/rest/v1/horses?select=id&limit=5", "/rest/v1/appointments?select=id&limit=5",
             "/rest/v1/profiles?select=id&limit=5", "/rest/v1/invoices?select=id&limit=5"):
    s, b = req("GET", path, T_TOK)
    check(f"TRIAL: {path.split('?')[0]} 200", s == 200, s)
try:
    r = urllib.request.urlopen("https://app.hufmanager.de/", timeout=15); html = r.read().decode()
    check("app.hufmanager.de 200 + Entry-Chunk", r.status == 200 and "/assets/index-" in html, r.status)
except Exception as e:
    check("app.hufmanager.de 200 + Entry-Chunk", False, e)

for n, ok, info in res:
    print(("PASS " if ok else "FAIL ") + n + ("" if ok else "  " + info))
print(f"{sum(ok for _, ok, _ in res)}/{len(res)}")
sys.exit(0 if all(ok for _, ok, _ in res) else 1)
