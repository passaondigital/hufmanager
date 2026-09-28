"""PROD Kern-Durchlauf (28.09.2026) mit QA-Provider TRIAL (account_class=qa, zählt in keiner KPI).
Gleiche Schreibwege wie die App: create_customer_with_contact → horses.insert (AddHorseModal) →
appointments.insert (Termin) → Update/Abschluss → generate_invoice_number + create_invoice_with_items
(CreateInvoiceModal) → Zahlstatus → Folgetermin → Neu-Login und Nachlesen. Danach Fremdzugriff durch QA B.
Die angelegten Datensätze bleiben als QA-Regressionsdaten (Kunde „QA-Kern <Datum>“), keine echten Daten.
Aufruf: python3 scripts/ops/prod_core_flow_smoke.py
"""
import sys, datetime
sys.path.insert(0, "/home/administrator/hufmanager/scripts/ops")
from qa_client import req, login

res = []
def check(name, ok, info=""):
    res.append((name, bool(ok), str(info)[:160]))
    return ok

TOK, T = login("TRIAL")
B_TOK, B = login("B")
stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
today = datetime.date.today()
R = {"Prefer": "return=representation"}

# 1 Kunde
s, b = req("POST", "/rest/v1/rpc/create_customer_with_contact", TOK,
           {"p_profile": {"full_name": f"QA-Kern {stamp}", "email": None, "phone": None, "street": "Teststr. 1", "zip_code": "04103", "city": "Leipzig"},
            "p_contact": {"category": "client"}})
cust = (b or {}).get("profile_id") or (b or {}).get("id") if isinstance(b, dict) else None
check("Kunde angelegt (create_customer_with_contact)", s == 200 and cust, (s, str(b)[:100]))

# 2 Pferd
s, b = req("POST", "/rest/v1/horses?select=id,name,owner_id", TOK, {"owner_id": cust, "name": f"QA-Pferd {stamp}", "equine_type": "horse"}, R)
horse = b[0]["id"] if s in (200, 201) and b else None
check("Pferd angelegt", horse, (s, str(b)[:100]))

# 3 Leistung (eigene)
s, b = req("GET", f"/rest/v1/services?select=id,name,base_price&provider_id=eq.{T}&is_active=eq.true&limit=1", TOK)
svc = b[0] if s == 200 and b else None
check("Leistungskatalog lesbar (nur eigene)", s == 200, (s, len(b) if isinstance(b, list) else b))

# 4 Termin anlegen, ändern, abschließen
d1 = (today + datetime.timedelta(days=1)).isoformat()
s, b = req("POST", "/rest/v1/appointments?select=id,status,date,time", TOK,
           {"horse_id": horse, "provider_id": T, "client_id": cust, "date": d1, "time": "09:00",
            "service_type": (svc or {}).get("name", "Barhufbearbeitung"), "service_id": (svc or {}).get("id"), "status": "planned"}, R)
appt = b[0]["id"] if s in (200, 201) and b else None
check("Termin angelegt", appt, (s, str(b)[:120]))
s, b = req("PATCH", f"/rest/v1/appointments?id=eq.{appt}&select=time", TOK, {"time": "10:30"}, R)
check("Termin geändert (Uhrzeit)", s == 200 and b and b[0]["time"].startswith("10:30"), (s, str(b)[:80]))
s, b = req("PATCH", f"/rest/v1/appointments?id=eq.{appt}&select=status", TOK, {"status": "completed"}, R)
check("Termin abgeschlossen", s == 200 and b and b[0]["status"] == "completed", (s, str(b)[:80]))

# 5 Rechnung (Nummer + atomar mit Positionen)
s, num = req("POST", "/rest/v1/rpc/generate_invoice_number", TOK, {"p_provider_id": T})
check("Rechnungsnummer vergeben", s == 200 and num, (s, num))
price = float((svc or {}).get("base_price") or 45)
s, b = req("POST", "/rest/v1/rpc/create_invoice_with_items", TOK, {
    "p_invoice": {"client_id": cust, "provider_id": T, "horse_id": horse, "invoice_number": num, "issue_date": today.isoformat(),
                  "due_date": (today + datetime.timedelta(days=14)).isoformat(), "total_amount": price, "status": "draft",
                  "payment_method": "Überweisung", "customer_type": "kleinunternehmer", "notes": "QA-Kern", "payment_status": "unpaid"},
    "p_items": [{"inventory_item_id": None, "title": (svc or {}).get("name", "Barhufbearbeitung"), "quantity": 1, "unit_price": price, "total_price": price}]})
inv = b.get("id") if isinstance(b, dict) else None
check("Rechnung mit Position atomar erstellt", s == 200 and inv, (s, str(b)[:120]))
s, b = req("GET", f"/rest/v1/invoices?select=invoice_number,total_amount,client_id,provider_id,invoice_items(title,quantity,unit_price,total_price)&id=eq.{inv}", TOK)
row = b[0] if s == 200 and b else {}
check("Rechnung: Nummer, Betrag, Kunde, Anbieter, Position vollständig",
      row.get("invoice_number") == num and float(row.get("total_amount") or 0) == price and row.get("client_id") == cust
      and row.get("provider_id") == T and len(row.get("invoice_items") or []) == 1, str(row)[:140])
s, b = req("PATCH", f"/rest/v1/invoices?id=eq.{inv}&select=payment_status,status", TOK, {"payment_status": "paid", "status": "paid"}, R)
check("Zahlstatus bezahlt", s == 200 and b and b[0]["payment_status"] == "paid", (s, str(b)[:80]))

# 6 Folgetermin
d2 = (today + datetime.timedelta(days=42)).isoformat()
s, b = req("POST", "/rest/v1/appointments?select=id", TOK, {"horse_id": horse, "provider_id": T, "client_id": cust, "date": d2, "time": "09:00",
            "service_type": (svc or {}).get("name", "Barhufbearbeitung"), "service_id": (svc or {}).get("id"), "status": "planned"}, R)
appt2 = b[0]["id"] if s in (200, 201) and b else None
check("Folgetermin angelegt", appt2, (s, str(b)[:80]))

# 7 Neu-Login: Daten noch korrekt
TOK2, _ = login("TRIAL")
s, b = req("GET", f"/rest/v1/appointments?select=id,status&horse_id=eq.{horse}&order=date", TOK2)
check("nach Neu-Login: 2 Termine (abgeschlossen + geplant)", s == 200 and [r["status"] for r in b] == ["completed", "planned"], (s, str(b)[:100]))
s, b = req("GET", f"/rest/v1/invoices?select=payment_status&id=eq.{inv}", TOK2)
check("nach Neu-Login: Rechnung bezahlt", s == 200 and b and b[0]["payment_status"] == "paid", (s, b))

# 8 Fremdzugriff durch QA B
for name, path in (("Kunde", f"/rest/v1/profiles?select=id&id=eq.{cust}"), ("Pferd", f"/rest/v1/horses?select=id&id=eq.{horse}"),
                   ("Termin", f"/rest/v1/appointments?select=id&id=eq.{appt}"), ("Rechnung", f"/rest/v1/invoices?select=id&id=eq.{inv}")):
    s, b = req("GET", path, B_TOK)
    check(f"QA B sieht {name} von TRIAL nicht", s == 200 and b == [], (s, b))
s, b = req("PATCH", f"/rest/v1/appointments?id=eq.{appt2}&select=id", B_TOK, {"time": "11:11"}, R)
check("QA B kann Termin von TRIAL nicht ändern", b == [] or s >= 400, (s, b))
s, b = req("PATCH", f"/rest/v1/invoices?id=eq.{inv}&select=id", B_TOK, {"payment_status": "unpaid"}, R)
check("QA B kann Rechnung von TRIAL nicht ändern", b == [] or s >= 400, (s, b))

print(f"IDs: customer={str(cust)[:8]} horse={str(horse)[:8]} invoice={str(inv)[:8]} number={num}")
for n, ok, info in res:
    print(("PASS " if ok else "FAIL ") + n + ("" if ok else f"  [{info}]"))
print(f"{sum(1 for _, ok, _ in res if ok)}/{len(res)}")
