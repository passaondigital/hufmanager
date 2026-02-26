-- VERIFIKATIONS-CHECKLIST für Migration
-- Führe diese Queries der Reihe nach im Supabase SQL Editor aus

-- ✅ CHECK 1: Tables existieren
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('emergency_otp', 'emergency_escalations', 'emergency_audit_log', 'price_groups', 'service_price_overrides')
ORDER BY table_name;
-- Sollte 5 Zeilen zurückgeben ✅

-- ✅ CHECK 2: Functions existieren
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_emergency_otp', 'get_provider_clients', 'calculate_effective_price', 'log_emergency_action')
ORDER BY routine_name;
-- Sollte 4 Zeilen zurückgeben ✅

-- ✅ CHECK 3: RLS ist aktiviert
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('emergency_otp', 'emergency_escalations', 'emergency_audit_log', 'price_groups', 'service_price_overrides')
AND schemaname = 'public'
ORDER BY tablename;
-- Sollte alle mit rowsecurity = true zeigen ✅

-- ✅ CHECK 4: Indexes existieren
SELECT tablename, indexname FROM pg_indexes 
WHERE tablename IN ('emergency_otp', 'emergency_escalations', 'price_groups', 'service_price_overrides')
AND schemaname = 'public'
ORDER BY tablename, indexname;
-- Sollte mehrere Indexes zeigen ✅

-- ✅ CHECK 5: Storage Bucket
SELECT id, name FROM storage.buckets WHERE id = 'emergency-logs';
-- Sollte 1 Zeile zurückgeben ✅

-- ✅ CHECK 6: Trigger existieren
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'trg_%'
ORDER BY trigger_name;
-- Sollte mindestens 3 Triggers zeigen ✅

-- 🎉 WENN ALLE 6 CHECKS GRÜN: Migration erfolgreich! 🎉
