import json,os,sys,urllib.request
U="https://vnschgjxkzzwzefqlrji.supabase.co"
K=[l.split("=",1)[1].strip().strip('"') for l in open(os.path.expanduser("/home/administrator/hufmanager/.env.hufmanager")) if l.startswith("VITE_SUPABASE_PUBLISHABLE_KEY=")][0]
C=dict(l.strip().split("=",1) for l in open(os.path.expanduser("~/.config/hufmanager-qa/credentials.env")) if "=" in l)
def req(method,path,token=None,body=None,headers=None):
    h={"apikey":K,"Content-Type":"application/json"}
    if token: h["Authorization"]="Bearer "+token
    if headers: h.update(headers)
    r=urllib.request.Request(U+path,data=json.dumps(body).encode() if body is not None else None,headers=h,method=method)
    try:
        resp=urllib.request.urlopen(r); t=resp.read().decode(); return resp.status,(json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t=e.read().decode()
        try: return e.code,json.loads(t)
        except Exception: return e.code,t
def login(x):
    s,b=req("POST","/auth/v1/token?grant_type=password",body={"email":C[f"QA_{x}_EMAIL"],"password":C[f"QA_{x}_PASSWORD"]})
    assert s==200,(s,b); return b["access_token"],b["user"]["id"]
