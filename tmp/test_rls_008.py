import subprocess
import json
import uuid
import sys

project_ref = "vnschgjxkzzwzefqlrji"

# Generate fresh UUIDs
provider_id = str(uuid.uuid4())
client_id = str(uuid.uuid4())
unrelated_id = str(uuid.uuid4())
horse_id = str(uuid.uuid4())
conversation_id = str(uuid.uuid4())

dummy_img_provider = str(uuid.uuid4())
dummy_img_client = str(uuid.uuid4())
dummy_voice = str(uuid.uuid4())

print(f"Provider ID: {provider_id}")
print(f"Client ID: {client_id}")
print(f"Unrelated ID: {unrelated_id}")
print(f"Horse ID: {horse_id}")
print(f"Conversation ID: {conversation_id}")

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
  ('{provider_id}', 'prov_{provider_id[:8]}@test.com', '{{}}'),
  ('{client_id}', 'client_{client_id[:8]}@test.com', '{{}}'),
  ('{unrelated_id}', 'unrelated_{unrelated_id[:8]}@test.com', '{{}}');

INSERT INTO public.profiles (id, email, full_name) VALUES 
  ('{provider_id}', 'prov_{provider_id[:8]}@test.com', 'Provider Test'),
  ('{client_id}', 'client_{client_id[:8]}@test.com', 'Client Test'),
  ('{unrelated_id}', 'unrelated_{unrelated_id[:8]}@test.com', 'Unrelated Test')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

INSERT INTO public.horses (id, name, owner_id) VALUES
  ('{horse_id}', 'Test Horse Chat', '{client_id}');

INSERT INTO public.conversations (id, provider_id, client_id) VALUES
  ('{conversation_id}', '{provider_id}', '{client_id}');

-- Pre-populate some images to test SELECT
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES
  ('{dummy_img_provider}', 'chat-images', '{conversation_id}/{provider_id}/img1.jpg', '{provider_id}'),
  ('{dummy_img_client}', 'chat-images', '{conversation_id}/{client_id}/img2.jpg', '{client_id}'),
  ('{dummy_voice}', 'chat-images', 'voices/{conversation_id}/voice1.webm', '{provider_id}');
COMMIT;
"""

print("\n--- Running Setup ---")
setup_res = run_query(setup_sql)
if "error" in setup_res:
    print(f"Setup Failed: {setup_res['error']}")
    sys.exit(1)
print("Setup completed successfully.")

results = {}

# T1: PARTICIPANT A UPLOAD PASS (Provider)
sql = f"""
BEGIN;
DROP POLICY IF EXISTS "Authenticated upload global" ON storage.objects;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{provider_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES 
  ('{str(uuid.uuid4())}', 'chat-images', '{conversation_id}/{provider_id}/test_upload.jpg', '{provider_id}');
ROLLBACK;
"""
res = run_query(sql)
results["PARTICIPANT_A_UPLOAD_PASS"] = "PASS" if "error" not in res else f"FAIL ({res['error']})"

# T2: PARTICIPANT A READ PASS
sql = f"""
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{provider_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
SELECT name FROM storage.objects WHERE name LIKE '{conversation_id}/%';
ROLLBACK;
"""
res = run_query(sql)
if "error" in res:
    results["PARTICIPANT_A_READ_PASS"] = f"FAIL ({res['error']})"
else:
    rows = res.get("rows", [])
    if len(rows) == 2:
        results["PARTICIPANT_A_READ_PASS"] = "PASS"
    else:
        results["PARTICIPANT_A_READ_PASS"] = f"FAIL (Expected 2 images, got {len(rows)})"

# T3: PARTICIPANT B UPLOAD PASS (Client)
sql = f"""
BEGIN;
DROP POLICY IF EXISTS "Authenticated upload global" ON storage.objects;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{client_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES 
  ('{str(uuid.uuid4())}', 'chat-images', '{conversation_id}/{client_id}/test_upload.jpg', '{client_id}');
ROLLBACK;
"""
res = run_query(sql)
results["PARTICIPANT_B_UPLOAD_PASS"] = "PASS" if "error" not in res else f"FAIL ({res['error']})"

# T4: PARTICIPANT B READ PASS
sql = f"""
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{client_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
SELECT name FROM storage.objects WHERE name LIKE '{conversation_id}/%';
ROLLBACK;
"""
res = run_query(sql)
if "error" in res:
    results["PARTICIPANT_B_READ_PASS"] = f"FAIL ({res['error']})"
else:
    rows = res.get("rows", [])
    if len(rows) == 2:
        results["PARTICIPANT_B_READ_PASS"] = "PASS"
    else:
        results["PARTICIPANT_B_READ_PASS"] = f"FAIL (Expected 2 images, got {len(rows)})"

# T5: UNRELATED AUTH UPLOAD DENY
sql = f"""
BEGIN;
DROP POLICY IF EXISTS "Authenticated upload global" ON storage.objects;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{unrelated_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES 
  ('{str(uuid.uuid4())}', 'chat-images', '{conversation_id}/{unrelated_id}/test_upload.jpg', '{unrelated_id}');
ROLLBACK;
"""
res = run_query(sql)
if "error" in res and ("42501" in str(res["error"]) or "row-level security" in str(res["error"])):
    results["UNRELATED_AUTH_UPLOAD_DENY"] = "PASS"
else:
    results["UNRELATED_AUTH_UPLOAD_DENY"] = f"FAIL (Expected RLS block, got: {res.get('error') or res.get('raw')})"

# T6: UNRELATED AUTH READ DENY
sql = f"""
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{unrelated_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
SELECT name FROM storage.objects WHERE name LIKE '{conversation_id}/%';
ROLLBACK;
"""
res = run_query(sql)
if "error" in res:
    results["UNRELATED_AUTH_READ_DENY"] = f"FAIL ({res['error']})"
else:
    rows = res.get("rows", [])
    if len(rows) == 0:
        results["UNRELATED_AUTH_READ_DENY"] = "PASS"
    else:
        results["UNRELATED_AUTH_READ_DENY"] = f"FAIL (Expected 0 images, got {len(rows)})"

# T7: MALFORMED CONVERSATION PATH DENY
sql = f"""
BEGIN;
DROP POLICY IF EXISTS "Authenticated upload global" ON storage.objects;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{provider_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES 
  ('{str(uuid.uuid4())}', 'chat-images', 'invalid-uuid/{provider_id}/test_upload.jpg', '{provider_id}');
ROLLBACK;
"""
res = run_query(sql)
if "error" in res and ("42501" in str(res["error"]) or "row-level security" in str(res["error"])):
    results["MALFORMED_CONVERSATION_PATH_DENY"] = "PASS"
else:
    results["MALFORMED_CONVERSATION_PATH_DENY"] = f"FAIL (Expected RLS block, got: {res.get('error') or res.get('raw')})"

# T8: NONEXISTENT CONVERSATION DENY
fake_conv = str(uuid.uuid4())
sql = f"""
BEGIN;
DROP POLICY IF EXISTS "Authenticated upload global" ON storage.objects;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{provider_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES 
  ('{str(uuid.uuid4())}', 'chat-images', '{fake_conv}/{provider_id}/test_upload.jpg', '{provider_id}');
ROLLBACK;
"""
res = run_query(sql)
if "error" in res and ("42501" in str(res["error"]) or "row-level security" in str(res["error"])):
    results["NONEXISTENT_CONVERSATION_DENY"] = "PASS"
else:
    results["NONEXISTENT_CONVERSATION_DENY"] = f"FAIL (Expected RLS block, got: {res.get('error') or res.get('raw')})"

# T9: VOICE UPLOAD PASS
sql = f"""
BEGIN;
DROP POLICY IF EXISTS "Authenticated upload global" ON storage.objects;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{provider_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES 
  ('{str(uuid.uuid4())}', 'chat-images', '{conversation_id}/{provider_id}/voice_new.webm', '{provider_id}');
ROLLBACK;
"""
res = run_query(sql)
results["VOICE_UPLOAD_PASS"] = "PASS" if "error" not in res else f"FAIL ({res['error']})"

# T10: VOICE READ PASS (old format)
sql = f"""
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{client_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
SELECT name FROM storage.objects WHERE name = 'voices/{conversation_id}/voice1.webm';
ROLLBACK;
"""
res = run_query(sql)
if "error" in res:
    results["VOICE_READ_PASS"] = f"FAIL ({res['error']})"
else:
    rows = res.get("rows", [])
    if len(rows) == 1:
        results["VOICE_READ_PASS"] = "PASS"
    else:
        results["VOICE_READ_PASS"] = f"FAIL (Expected 1 voice, got {len(rows)})"

# T11: NORMAL CHAT MESSAGE REGRESSION PASS
sql = f"""
BEGIN;
DO $$ BEGIN PERFORM set_config('request.jwt.claims', '{{\"sub\": \"{provider_id}\"}}', true); END; $$;
SET LOCAL ROLE authenticated;
INSERT INTO messages (conversation_id, sender_id, content) VALUES ('{conversation_id}', '{provider_id}', 'Hello World') RETURNING id;
ROLLBACK;
"""
res = run_query(sql)
if "error" in res:
    results["NORMAL_CHAT_MESSAGE_REGRESSION_PASS"] = f"FAIL ({res['error']})"
else:
    rows = res.get("rows", [])
    if len(rows) == 1:
        results["NORMAL_CHAT_MESSAGE_REGRESSION_PASS"] = "PASS"
    else:
        results["NORMAL_CHAT_MESSAGE_REGRESSION_PASS"] = f"FAIL (Expected returning id)"

# 2. TEARDOWN TEST DATA
teardown_sql = f"""
BEGIN;
SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM storage.objects WHERE id IN ('{dummy_img_provider}', '{dummy_img_client}', '{dummy_voice}');
DELETE FROM public.messages WHERE conversation_id = '{conversation_id}';
DELETE FROM public.conversations WHERE id = '{conversation_id}';
DELETE FROM public.horse_audit_log WHERE horse_id = '{horse_id}';
DELETE FROM public.horses WHERE id = '{horse_id}';
DELETE FROM public.profiles WHERE id IN ('{provider_id}', '{client_id}', '{unrelated_id}');
DELETE FROM auth.users WHERE id IN ('{provider_id}', '{client_id}', '{unrelated_id}');
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
