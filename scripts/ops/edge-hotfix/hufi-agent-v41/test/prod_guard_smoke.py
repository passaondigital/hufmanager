"""PROD-Smoke Termin-DB-Guard (27.09.2026) über REST mit QA-JWT (A=+qa-trial). Nur QA-0927-Daten."""
import sys
sys.path.insert(0, "/home/administrator/hufmanager/scripts/ops")
from qa_client import req, login
A_TOK, A = login("TRIAL")
OWN_H, OWN_C = "3ad2c166-677c-4517-b772-b7f2c1b26dd1", "19c087ae-6bf6-4b13-8a87-61bc96efa1bd"
B_H, B_C = "b0270927-0000-4000-8000-000000004401", "b0270927-0000-4000-8000-00000000cc01"
SH_H, SH_C = "7ffae532-4c12-453d-b9d5-23c51529357e", "bd457132-c8fb-44cb-b913-57b12955ab79"
AA1 = "a0270927-0000-4000-8000-00000000aa01"
P = {"Prefer": "return=representation"}
res = []
def ins(h, c, note):
    body = {"provider_id": A, "horse_id": h, "date": "2026-11-05", "status": "planned", "notes": note}
    if c: body["client_id"] = c
    return req("POST", "/rest/v1/appointments?select=id", A_TOK, body, P)
def blocked(s, b, txt): return s in (400, 401, 403) and txt in str(b)
s, b = ins(OWN_H, OWN_C, "QA-0927 G1")
res.append(("G1 own client+horse -> allowed", s == 201, f"{s} {b}"))
s, b = ins(B_H, B_C, "QA-0927 G2")
res.append(("G2 foreign client+horse -> BLOCK", blocked(s, b, "gehört nicht zu diesem Betrieb"), f"{s} {b}"))
s, b = ins(B_H, None, "QA-0927 G3")
res.append(("G3 foreign horse (no client) -> BLOCK", blocked(s, b, "gehört nicht zu diesem Betrieb"), f"{s} {b}"))
s, b = ins(OWN_H, SH_C, "QA-0927 G4")
res.append(("G4 horse does not match client -> BLOCK", blocked(s, b, "Pferd gehört nicht zu diesem Kunden"), f"{s} {b}"))
s, b = ins(SH_H, B_C, "QA-0927 G5")
res.append(("G5 own (shared) horse + foreign client -> BLOCK", blocked(s, b, "Pferd gehört nicht zu diesem Kunden"), f"{s} {b}"))
s, b = req("PATCH", f"/rest/v1/appointments?id=eq.{AA1}&select=id,notes", A_TOK, {"notes": "QA-0927 G6", "date": "2026-10-24", "time": "09:30"}, P)
res.append(("G6 legacy/own appt date/time/notes edit -> allowed", s == 200 and b and b[0]["notes"] == "QA-0927 G6", f"{s} {b}"))
s, b = req("PATCH", f"/rest/v1/appointments?id=eq.{AA1}&select=id", A_TOK, {"horse_id": B_H}, P)
res.append(("G7 bend appt to foreign horse -> BLOCK", blocked(s, b, "gehört nicht"), f"{s} {b}"))
s, b = req("PATCH", f"/rest/v1/appointments?id=eq.{AA1}&select=id", A_TOK, {"client_id": B_C}, P)
res.append(("G8 bend appt to foreign client -> BLOCK", blocked(s, b, "Pferd gehört nicht zu diesem Kunden"), f"{s} {b}"))
s, b = req("PATCH", f"/rest/v1/appointments?id=eq.{AA1}&select=id", A_TOK, {"horse_id": B_H, "client_id": B_C}, P)
res.append(("G9 bend appt to foreign horse+client -> BLOCK", blocked(s, b, "gehört nicht zu diesem Betrieb"), f"{s} {b}"))
for n, ok, i in res: print("PASS" if ok else "FAIL", "|", n, "" if ok else "| " + i[:200])
print(f"{sum(r[1] for r in res)}/{len(res)}")
