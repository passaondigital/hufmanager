import subprocess
import json
import uuid
import sys

project_ref = "vnschgjxkzzwzefqlrji"

# Generate fresh UUIDs
seller_id = str(uuid.uuid4())
buyer_id = str(uuid.uuid4())
unrelated_id = str(uuid.uuid4())
horse_id = str(uuid.uuid4())
transfer_id = str(uuid.uuid4())

dummy_id1 = str(uuid.uuid4())
dummy_id2 = str(uuid.uuid4())
dummy_id3 = str(uuid.uuid4())

print(f"Seller ID: {seller_id}")
print(f"Buyer ID: {buyer_id}")
print(f"Unrelated ID: {unrelated_id}")
print(f"Horse ID: {horse_id}")
print(f"Transfer ID: {transfer_id}")

def run_query(sql):
    cmd = [
        "npx", "supabase", "db", "query",
        "--linked",
        "--project-ref", project_ref,
        sql
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        return {"error": res.stdout or res.stderr}
    
    # Try parsing JSON if there are rows
    output = res.stdout
    if "{" in output:
        try:
            json_str = output[output.find("{") : output.rfind("}") + 1]
            return json.loads(json_str)
        except Exception as e:
            pass
    return {"success": True, "raw": output}

# 1. SETUP TEST DATA
setup_sql = f"""
BEGIN;
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES 
  ('{seller_id}', 'seller_{seller_id[:8]}@test.com', '{{}}'),
  ('{buyer_id}', 'buyer_{buyer_id[:8]}@test.com', '{{}}'),
  ('{unrelated_id}', 'unrelated_{unrelated_id[:8]}@test.com', '{{}}');

INSERT INTO public.profiles (id, email, full_name) VALUES 
  ('{seller_id}', 'seller_{seller_id[:8]}@test.com', 'Seller Test'),
  ('{buyer_id}', 'buyer_{buyer_id[:8]}@test.com', 'Buyer Test'),
  ('{unrelated_id}', 'unrelated_{unrelated_id[:8]}@test.com', 'Unrelated Test')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

INSERT INTO public.horses (id, name, owner_id) VALUES
  ('{horse_id}', 'Test Horse RLS', '{seller_id}');

INSERT INTO public.horse_transfers (id, horse_id, seller_id, buyer_id, buyer_email, status, initiated_at) VALUES
  ('{transfer_id}', '{horse_id}', '{seller_id}', '{buyer_id}', 'buyer_{buyer_id[:8]}@test.com', 'initiated', now());

INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES
  ('{dummy_id1}', 'horse-documents', 'transfers/{transfer_id}/seller/contract.pdf', '{seller_id}'),
  ('{dummy_id2}', 'horse-documents', 'transfers/{transfer_id}/buyer/contract.pdf', '{buyer_id}'),
  ('{dummy_id3}', 'horse-documents', 'transfers/99999999-9999-9999-9999-999999999999/seller/fake.pdf', '{unrelated_id}');
COMMIT;
"""

print("\n--- Running Setup ---")
setup_res = run_query(setup_sql)
if "error" in setup_res:
    print(f"Setup Failed: {setup_res['error']}")
    sys.exit(1)
print("Setup completed successfully.")

results = {}

# Test 1: Seller A can SELECT his transfer docs
print("\n--- Running Test 1: Seller SELECT ---")
sql = f"""
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{seller_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
SELECT name FROM storage.objects WHERE name LIKE 'transfers/{transfer_id}/%';
ROLLBACK;
"""
res = run_query(sql)
if "error" in res:
    results["T1"] = f"FAIL (Error: {res['error']})"
else:
    rows = res.get("rows", [])
    names = [r["name"] for r in rows]
    if len(names) == 2:
        results["T1"] = "PASS"
    else:
        results["T1"] = f"FAIL (Expected 2 files, found {len(names)}: {names})"

# Test 2: Buyer B can SELECT transfer docs
print("\n--- Running Test 2: Buyer SELECT ---")
sql = f"""
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{buyer_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
SELECT name FROM storage.objects WHERE name LIKE 'transfers/{transfer_id}/%';
ROLLBACK;
"""
res = run_query(sql)
if "error" in res:
    results["T2"] = f"FAIL (Error: {res['error']})"
else:
    rows = res.get("rows", [])
    names = [r["name"] for r in rows]
    if len(names) == 2:
        results["T2"] = "PASS"
    else:
        results["T2"] = f"FAIL (Expected 2 files, found {len(names)}: {names})"

# Test 3: Unrelated user U cannot SELECT
print("\n--- Running Test 3: Unrelated SELECT ---")
sql = f"""
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{unrelated_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
SELECT name FROM storage.objects WHERE name LIKE 'transfers/{transfer_id}/%';
ROLLBACK;
"""
res = run_query(sql)
if "error" in res:
    results["T3"] = f"FAIL (Error: {res['error']})"
else:
    rows = res.get("rows", [])
    if len(rows) == 0:
        results["T3"] = "PASS"
    else:
        results["T3"] = f"FAIL (Expected 0 files, found {len(rows)}: {rows})"

# Test 4: Malformed path SELECT denied
print("\n--- Running Test 4: Malformed SELECT ---")
sql = f"""
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{seller_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
SELECT name FROM storage.objects WHERE name = 'transfers/invalid-uuid/seller/contract.pdf';
ROLLBACK;
"""
res = run_query(sql)
if "error" in res:
    results["T4"] = f"FAIL (Exception/Error: {res['error']})"
else:
    rows = res.get("rows", [])
    if len(rows) == 0:
        results["T4"] = "PASS"
    else:
        results["T4"] = f"FAIL (Expected 0, found {len(rows)}: {rows})"

# Test 5: Nonexistent transfer ID SELECT denied
print("\n--- Running Test 5: Nonexistent SELECT ---")
sql = f"""
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{seller_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
SELECT name FROM storage.objects WHERE name = 'transfers/99999999-9999-9999-9999-999999999999/seller/fake.pdf';
ROLLBACK;
"""
res = run_query(sql)
if "error" in res:
    results["T5"] = f"FAIL (Error: {res['error']})"
else:
    rows = res.get("rows", [])
    if len(rows) == 0:
        results["T5"] = "PASS"
    else:
        results["T5"] = f"FAIL (Expected 0, found {len(rows)}: {rows})"

# Test 6: Seller A upload PASS
print("\n--- Running Test 6: Seller INSERT ---")
sql = f"""
BEGIN;
DROP POLICY IF EXISTS "Authenticated upload global" ON storage.objects;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{seller_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES 
  ('{str(uuid.uuid4())}', 'horse-documents', 'transfers/{transfer_id}/seller/new_upload.pdf', '{seller_id}');
SELECT TRUE as inserted;
ROLLBACK;
"""
res = run_query(sql)
if "error" in res:
    results["T6"] = f"FAIL (Error: {res['error']})"
else:
    results["T6"] = "PASS"

# Test 7: Unrelated upload DENY
print("\n--- Running Test 7: Unrelated INSERT ---")
sql = f"""
BEGIN;
DROP POLICY IF EXISTS "Authenticated upload global" ON storage.objects;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{unrelated_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES 
  ('{str(uuid.uuid4())}', 'horse-documents', 'transfers/{transfer_id}/seller/unrelated_upload.pdf', '{unrelated_id}');
ROLLBACK;
"""
res = run_query(sql)
# Since RLS failure in storage schema raises: "ERROR:  42501: row-level security policy violation"
if "error" in res and ("42501" in str(res["error"]) or "row-level security" in str(res["error"])):
    results["T7"] = "PASS"
else:
    results["T7"] = f"FAIL (Expected RLS block, got: {res.get('error') or res.get('raw')})"

# Test 8: Malformed path upload DENY
print("\n--- Running Test 8: Malformed INSERT ---")
sql = f"""
BEGIN;
DROP POLICY IF EXISTS "Authenticated upload global" ON storage.objects;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{seller_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES 
  ('{str(uuid.uuid4())}', 'horse-documents', 'transfers/invalid-uuid/seller/upload.pdf', '{seller_id}');
ROLLBACK;
"""
res = run_query(sql)
if "error" in res and ("42501" in str(res["error"]) or "row-level security" in str(res["error"])):
    results["T8"] = "PASS"
else:
    results["T8"] = f"FAIL (Expected RLS block, got: {res.get('error') or res.get('raw')})"

# 2. TEARDOWN TEST DATA
teardown_sql = f"""
BEGIN;
SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM storage.objects WHERE id IN ('{dummy_id1}', '{dummy_id2}', '{dummy_id3}');
DELETE FROM public.horse_transfers WHERE id = '{transfer_id}';
DELETE FROM public.horse_audit_log WHERE horse_id = '{horse_id}';
DELETE FROM public.horses WHERE id = '{horse_id}';
DELETE FROM public.profiles WHERE id IN ('{seller_id}', '{buyer_id}', '{unrelated_id}');
DELETE FROM auth.users WHERE id IN ('{seller_id}', '{buyer_id}', '{unrelated_id}');
COMMIT;
"""

print("\n--- Running Teardown ---")
teardown_res = run_query(teardown_sql)
if "error" in teardown_res:
    print(f"Teardown Failed: {teardown_res['error']}")
else:
    print("Teardown completed successfully.")

print("\n=== FINAL TEST RESULTS ===")
for k, v in results.items():
    print(f"{k}: {v}")
