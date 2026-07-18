-- Store-Fahrplan Schritt 3C — Punkt 14: function_search_path_mutable.
-- Nur search_path ergaenzt, Logik unveraendert.
CREATE OR REPLACE FUNCTION public.add_hufi_credits(p_user_id uuid, p_amount integer, p_description text DEFAULT NULL::text, p_stripe_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO hufi_credits (user_id, balance, total_purchased)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET
      balance         = hufi_credits.balance + p_amount,
      total_purchased = hufi_credits.total_purchased + GREATEST(p_amount, 0);
  INSERT INTO hufi_credit_transactions (user_id, type, amount, description, stripe_id)
    VALUES (p_user_id, 'purchase', p_amount, p_description, p_stripe_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_agent_tasks_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.update_ai_befunde_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;
