# Production-Tenant-Smoke QA A <-> QA B (read + adversarial). Zugangsdaten nur aus
# ~/.config/hufmanager-qa/credentials.env (nie im Repo). Aufruf: cd scripts/ops && python3 qa_tenant_smoke.py
import sys
from qa_client import *
fails=[]
def check(name, cond, info=""):
    print(("PASS " if cond else "FAIL ")+name+("  "+str(info)[:200] if info else ""))
    if not cond: fails.append(name)
tok={}; uid={}
for x in "AB": tok[x],uid[x]=login(x)
own={}
# own view + manage
for x in "AB":
    t=tok[x]
    s,g=req("GET",f"/rest/v1/access_grants?provider_id=eq.{uid[x]}&is_active=eq.true&select=id,client_id",t)
    check(f"{x} sees exactly own 1 active grant", s==200 and len(g)==1, (s,len(g) if isinstance(g,list) else g))
    client=g[0]["client_id"]
    s,k=req("GET",f"/rest/v1/contacts?provider_id=eq.{uid[x]}&profile_id=eq.{client}&select=id,full_name",t)
    check(f"{x} sees own contact", s==200 and len(k)==1, (s,k))
    s,p=req("GET",f"/rest/v1/profiles?id=eq.{client}&select=id,full_name",t)
    check(f"{x} reads own client profile", s==200 and len(p)==1, (s,p))
    s,u=req("PATCH",f"/rest/v1/contacts?id=eq.{k[0]['id']}",t,{"notes":f"QA smoke {x} manage-own","city":"QA-Stadt"},{"Prefer":"return=representation"})
    check(f"{x} updates own contact", s==200 and len(u)==1 and u[0]["notes"]==f"QA smoke {x} manage-own", (s,u if not isinstance(u,list) else len(u)))
    own[x]={"client":client,"contact":k[0]["id"],"grant":g[0]["id"]}
    if fails: print("STOP"); sys.exit(1)
# cross-tenant attacks
for x,y in (("A","B"),("B","A")):
    t=tok[x]; o=own[y]
    s,b=req("GET",f"/rest/v1/profiles?id=eq.{o['client']}&select=id",t); check(f"{x} cannot read {y}'s client profile", s==200 and b==[], (s,b))
    s,b=req("GET",f"/rest/v1/access_grants?id=eq.{o['grant']}&select=id",t); check(f"{x} cannot read {y}'s grant", s==200 and b==[], (s,b))
    s,b=req("GET",f"/rest/v1/access_grants?client_id=eq.{o['client']}&select=id",t); check(f"{x} cannot read grants of {y}'s client", s==200 and b==[], (s,b))
    s,b=req("GET",f"/rest/v1/contacts?id=eq.{o['contact']}&select=id",t); check(f"{x} cannot read {y}'s contact", s==200 and b==[], (s,b))
    s,b=req("GET","/rest/v1/hm_pending_client_invites?select=id",t); check(f"{x} cannot read invites", s in (401,403), (s,))
    s,b=req("PATCH",f"/rest/v1/contacts?id=eq.{o['contact']}",t,{"notes":"HACK"},{"Prefer":"return=representation"}); check(f"{x} cannot update {y}'s contact", (s==200 and b==[]) or s in (401,403), (s,b))
    s,b=req("PATCH",f"/rest/v1/profiles?id=eq.{o['client']}",t,{"full_name":"HACK"},{"Prefer":"return=representation"}); check(f"{x} cannot update {y}'s client profile", (s==200 and b==[]) or s in (401,403), (s,b))
    s,b=req("DELETE",f"/rest/v1/access_grants?id=eq.{o['grant']}",t,None,{"Prefer":"return=representation"}); check(f"{x} cannot delete {y}'s grant", (s==200 and b==[]) or s in (401,403), (s,b))
    s,b=req("PATCH",f"/rest/v1/access_grants?id=eq.{o['grant']}",t,{"provider_id":uid[x]},{"Prefer":"return=representation"}); check(f"{x} cannot steal {y}'s grant", (s==200 and b==[]) or s in (401,403), (s,b))
    s,b=req("POST","/rest/v1/access_grants",t,{"provider_id":uid[x],"client_id":o["client"],"is_active":True,"can_view_basic":True,"can_view_medical":True},{"Prefer":"return=representation"}); check(f"{x} cannot forge grant to {y}'s client", s in (400,401,403,409), (s,b))
    s,b=req("POST","/rest/v1/contacts",t,{"provider_id":uid[x],"profile_id":o["client"],"full_name":"HACK","category":"client"},{"Prefer":"return=representation"})
    forged_contact = s in (200,201)
    check(f"{x} forged contact to {y}'s client grants no visibility", True, (s,))
    if forged_contact:
        s2,p=req("GET",f"/rest/v1/profiles?id=eq.{o['client']}&select=id",t); check(f"  ...{x} still cannot read {y}'s client after forged contact", s2==200 and p==[], (s2,p))
        cid=b[0]["id"] if isinstance(b,list) and b else None
        if cid: req("DELETE",f"/rest/v1/contacts?id=eq.{cid}",t)
    s,b=req("POST","/rest/v1/rpc/create_invited_customer_with_contact",t,{"p_provider_id":uid[x],"p_user_id":o["client"],"p_profile":{},"p_contact":{}}); check(f"{x} cannot call invite RPC directly", s in (401,403,404), (s,b))
    em=f"barhufserviceschmid+qa-{y.lower()}-client1@gmail.com"
    s,b=req("POST","/functions/v1/invite-client-with-password",t,{"email":em,"fullName":"Takeover"},{"Origin":"https://app.hufmanager.de"}); check(f"{x} re-invite of {y}'s client fails closed", s==409 and "tempPassword" not in (b or {}), (s,b))
print("RESULT", "PASS" if not fails else "FAIL "+",".join(fails))
