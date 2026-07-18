-- Store-Fahrplan Schritt 3B — Fund 4+5: Guthaben-Funktionen absichern

-- Fund 4: add_hufi_credits / add_purchased_voice_credits dürfen NICHT vom
-- Client aufrufbar sein — nur serverseitig nach echtem CopeCart-Kauf-Webhook
-- (copecart-webhook läuft mit service_role). add_hufi_credits wird aktuell
-- von keinem Code-Pfad aufgerufen (Altlast), wird aber ebenso gesperrt.
-- Supabase grantet EXECUTE bei CREATE FUNCTION nicht nur an PUBLIC, sondern
-- zusätzlich direkt an anon/authenticated (eigene ACL-Einträge) — beide
-- müssen explizit genannt werden, sonst bleibt der Aufruf trotz
-- "REVOKE ... FROM PUBLIC" möglich.
REVOKE EXECUTE ON FUNCTION public.add_hufi_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_hufi_credits(uuid, integer, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.add_purchased_voice_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_purchased_voice_credits(uuid, integer, text, text) TO service_role;

-- Fund 5: use_hufi_credit / consume_hufi_voice_credit dürfen nur das EIGENE
-- Guthaben des aufrufenden Nutzers verbrauchen. p_user_id bleibt in der
-- Signatur (Frontend/hufi-tts übergeben ohnehin schon die eigene auth.uid()),
-- wird aber für die eigentliche Verbuchung durch auth.uid() ersetzt.
CREATE OR REPLACE FUNCTION public.use_hufi_credit(p_user_id uuid, p_model text DEFAULT 'claude-haiku'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT balance INTO v_balance
    FROM hufi_credits
    WHERE user_id = v_user_id
    FOR UPDATE;
  IF v_balance IS NULL OR v_balance <= 0 THEN
    RETURN false;
  END IF;
  UPDATE hufi_credits
    SET balance = balance - 1
    WHERE user_id = v_user_id;
  INSERT INTO hufi_credit_transactions (user_id, type, amount, description)
    VALUES (v_user_id, 'usage', -1, 'KI-Antwort (' || p_model || ')');
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_hufi_voice_credit(p_user_id uuid, p_seconds numeric, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_rate_cents_per_second integer := 1;
  v_cost_cents integer := GREATEST(CEIL(p_seconds * v_rate_cents_per_second), 0);
  v_row public.hufi_voice_credits;
  v_from_monthly integer;
  v_from_purchased integer;
  v_remaining integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  v_row := public.ensure_hufi_voice_credits_current(v_user_id);

  IF v_row.purchased_expires_at IS NOT NULL AND v_row.purchased_expires_at < now() AND v_row.purchased_balance_cents > 0 THEN
    INSERT INTO public.hufi_voice_credit_transactions (user_id, amount_cents, source, type, description)
      VALUES (v_user_id, -v_row.purchased_balance_cents, 'purchased', 'admin_adjustment', 'Zusatz-Guthaben abgelaufen');
    UPDATE public.hufi_voice_credits SET purchased_balance_cents = 0, updated_at = now()
      WHERE user_id = v_user_id RETURNING * INTO v_row;
  END IF;

  v_remaining := v_cost_cents;
  v_from_monthly := LEAST(v_remaining, GREATEST(v_row.monthly_balance_cents, 0));
  v_remaining := v_remaining - v_from_monthly;
  v_from_purchased := LEAST(v_remaining, GREATEST(v_row.purchased_balance_cents, 0));
  v_remaining := v_remaining - v_from_purchased;

  UPDATE public.hufi_voice_credits
    SET monthly_balance_cents   = monthly_balance_cents - v_from_monthly,
        purchased_balance_cents = purchased_balance_cents - v_from_purchased,
        updated_at              = now()
    WHERE user_id = v_user_id
    RETURNING * INTO v_row;

  IF v_from_monthly > 0 THEN
    INSERT INTO public.hufi_voice_credit_transactions (user_id, amount_cents, source, type, description, duration_seconds)
      VALUES (v_user_id, -v_from_monthly, 'monthly_base', 'usage', p_description, p_seconds);
  END IF;
  IF v_from_purchased > 0 THEN
    INSERT INTO public.hufi_voice_credit_transactions (user_id, amount_cents, source, type, description, duration_seconds)
      VALUES (v_user_id, -v_from_purchased, 'purchased', 'usage', p_description, p_seconds);
  END IF;

  RETURN jsonb_build_object(
    'cost_cents', v_cost_cents,
    'covered_cents', v_from_monthly + v_from_purchased,
    'fully_covered', v_remaining = 0,
    'monthly_balance_cents', v_row.monthly_balance_cents,
    'purchased_balance_cents', v_row.purchased_balance_cents
  );
END;
$function$;
