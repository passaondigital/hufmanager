"""PROD Billing-/Access-Security-Smoke (28.09.2026). Nur QA-Provider (TRIAL, B), keine Tokens in der Ausgabe.
Jeder Schreibversuch ist einer, dessen Ablehnung/Wirkungslosigkeit erwartet wird; der Vorher-Zustand wird
gelesen und danach verglichen. Unerwarteter Erfolg → FAIL (und Wert wird, wo möglich, zurückgesetzt).
Aufruf: python3 scripts/ops/prod_billing_access_smoke.py
"""
import sys
sys.path.insert(0, "/home/administrator/hufmanager/scripts/ops")
from qa_client import req, login

res = []
def check(name, ok, info=""):
    res.append((name, bool(ok), str(info)[:140]))

T_TOK, T = login("TRIAL")
B_TOK, B = login("B")
PROT = "account_class,access_valid_until,copecart_subscription_id,is_manually_managed,signup_app,plan_override,subscription_status,trial_ends_at,is_suspended"

def own_profile(tok, uid):
    s, b = req("GET", f"/rest/v1/profiles?select={PROT}&id=eq.{uid}", tok)
    return b[0] if s == 200 and b else None

# 1) Self-Update geschützter Billing-/Access-Felder → wirkungslos
before = own_profile(T_TOK, T)
s, b = req("PATCH", f"/rest/v1/profiles?id=eq.{T}", T_TOK, {
    "account_class": "real" if before["account_class"] != "real" else "qa",
    "access_valid_until": "2099-12-31T00:00:00Z", "copecart_subscription_id": "smoke-fake",
    "is_manually_managed": not bool(before["is_manually_managed"]), "plan_override": "lifetime_grant",
    "subscription_status": "active", "trial_ends_at": "2099-12-31T00:00:00Z",
}, {"Prefer": "return=minimal"})
after = own_profile(T_TOK, T)
check("Provider: geschützte Profilfelder (inkl. account_class) unverändert", after == before, (s, [k for k in before if before[k] != after.get(k)]))

# 2) product_entitlements: kein Insert/Update/Delete durch Provider
s, ent_before = req("GET", f"/rest/v1/product_entitlements?select=status,trial_ends_at,billing_status&user_id=eq.{T}", T_TOK)
s1, b1 = req("PATCH", f"/rest/v1/product_entitlements?user_id=eq.{T}", T_TOK, {"status": "ACTIVE", "billing_status": "VERIFIED_PAID"}, {"Prefer": "return=representation"})
s2, b2 = req("POST", "/rest/v1/product_entitlements", T_TOK, {"user_id": B, "product": "HUFMANAGER", "plan": "HUFMANAGER_SLIM", "status": "ACTIVE"}, {"Prefer": "return=representation"})
s3, b3 = req("DELETE", f"/rest/v1/product_entitlements?user_id=eq.{T}", T_TOK, None, {"Prefer": "return=representation"})
s, ent_after = req("GET", f"/rest/v1/product_entitlements?select=status,trial_ends_at,billing_status&user_id=eq.{T}", T_TOK)
check("Provider: Entitlement-Update/Insert/Delete wirkungslos", ent_after == ent_before and not (isinstance(b2, list) and b2), (s1, s2, s3))

# 3) Manual-Writer: Kern nur service_role, Wrapper verlangt Admin, Self-Grant blockiert
s, b = req("POST", "/rest/v1/rpc/hm_set_hufmanager_manual_access_v1", T_TOK,
           {"p_user_id": T, "p_grant_type": "MANUAL_LIFETIME", "p_last_valid_day": None, "p_reason": "smoke", "p_actor_id": T})
check("Provider: Kern-Writer nicht ausführbar", s in (401, 403, 404) or (isinstance(b, dict) and "permission" in str(b).lower()), s)
s, b = req("POST", "/rest/v1/rpc/hm_admin_set_hufmanager_manual_access_v1", T_TOK,
           {"p_user_id": T, "p_grant_type": "MANUAL_LIFETIME", "p_last_valid_day": None, "p_reason": "smoke"})
check("Provider: Self-Grant über Admin-Wrapper blockiert", s >= 400 and ("actor_not_admin" in str(b) or "self_grant" in str(b)), (s, str(b)[:60]))
s, b = req("POST", "/rest/v1/rpc/hm_admin_set_hufmanager_manual_access_v1", T_TOK,
           {"p_user_id": B, "p_grant_type": "MANUAL_LIFETIME", "p_last_valid_day": None, "p_reason": "smoke"})
check("Provider: Grant für anderen Provider blockiert", s >= 400 and "actor_not_admin" in str(b), (s, str(b)[:60]))
s, b = req("POST", "/rest/v1/rpc/hm_admin_set_hufmanager_manual_access_v1", None,
           {"p_user_id": B, "p_grant_type": "MANUAL_LIFETIME", "p_last_valid_day": None, "p_reason": "smoke"})
check("anon: Admin-Wrapper blockiert", s in (401, 403, 404) or "permission" in str(b).lower(), s)
s, ent_final = req("GET", f"/rest/v1/product_entitlements?select=status,trial_ends_at,billing_status&user_id=eq.{T}", T_TOK)
check("Provider-Entitlement nach Writer-Versuchen unverändert", ent_final == ent_before, "")

# 4) admin-create-user als Provider → 403, keine Anlage
s, b = req("POST", "/functions/v1/admin-create-user", T_TOK,
           {"email": "never-created-smoke@example.test", "firstName": "No", "lastName": "Create", "accountClass": "qa"})
check("Provider: admin-create-user → 403", s == 403, s)
s, b = req("POST", "/functions/v1/admin-create-user", None, {})
check("anon: admin-create-user → 401", s == 401, s)

# 5) Ungültige Grant-Art (Wrapper prüft Admin zuerst → auch für Provider abgelehnt)
s, b = req("POST", "/rest/v1/rpc/hm_admin_set_hufmanager_manual_access_v1", T_TOK,
           {"p_user_id": B, "p_grant_type": "VERIFIED_PAID", "p_last_valid_day": None, "p_reason": "smoke"})
check("Provider: ungültige Grant-Art blockiert", s >= 400, (s, str(b)[:60]))

# 6) Zugang TRIAL weiterhin korrekt
s, b = req("POST", "/rest/v1/rpc/get_hufmanager_access_context_v1", T_TOK, {})
ctx = b[0] if isinstance(b, list) and b else {}
check("TRIAL: Access-Context unverändert lesbar", s == 200 and "has_access" in ctx, (s, ctx.get("reason_code")))

for n, ok, info in res:
    print(("PASS " if ok else "FAIL ") + n + ("" if ok else f"  [{info}]"))
print(f"{sum(1 for _, ok, _ in res if ok)}/{len(res)}")
