-- Nachtrag zu 20260718091500_fix_credit_functions_authz.sql: der erste Versuch
-- widerrief EXECUTE nur von PUBLIC. Supabase grantet bei CREATE FUNCTION aber
-- zusätzlich eigene ACL-Einträge direkt an anon/authenticated — die blieben
-- bestehen, wodurch der Angriff (Pentest bestätigt) weiterhin möglich war.
-- Dieser Nachtrag widerruft explizit auch von anon und authenticated.
REVOKE EXECUTE ON FUNCTION public.add_hufi_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_hufi_credits(uuid, integer, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.add_purchased_voice_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_purchased_voice_credits(uuid, integer, text, text) TO service_role;
