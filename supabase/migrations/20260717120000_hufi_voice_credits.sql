-- ─────────────────────────────────────────────────────────────────────────────
-- Voice-Guthaben-System (Premium-TTS-Minuten)
--
-- WICHTIG: Dies ist bewusst NICHT dieselbe Ressource wie hufi_credits /
-- hufi_credit_transactions (die zählen KI-Text-Antworten, 1 Einheit pro
-- Claude-Call, siehe use_hufi_credit()/ai-routing.ts). hufi_voice_credits
-- verfolgt separat die ElevenLabs-Sprachausgabe in Sekunden/Cent, damit
-- beide Abrechnungskreise sich nicht gegenseitig beeinflussen.
--
-- Einheit: 1 "Cent" = 1 Sekunde Premium-Voice zum internen Verrechnungssatz
-- HUFI_VOICE_RATE_CENTS_PER_SECOND (siehe consume_hufi_voice_credit unten).
-- Das ist eine interne Verrechnungsgröße, kein direkter 1:1-Bezug zu echten
-- ElevenLabs-Kosten — bei Bedarf anpassen.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hufi_voice_credits (
  user_id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_base_cents       integer NOT NULL DEFAULT 0,
  monthly_balance_cents    integer NOT NULL DEFAULT 0,
  monthly_reset_at         timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  purchased_balance_cents  integer NOT NULL DEFAULT 0,
  purchased_expires_at     timestamptz,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hufi_voice_credit_transactions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents       integer NOT NULL,       -- negativ = Verbrauch, positiv = Kauf/Gutschrift/Reset
  source             text NOT NULL CHECK (source IN ('monthly_base', 'purchased')),
  type               text NOT NULL CHECK (type IN ('usage', 'purchase', 'monthly_reset', 'admin_adjustment')),
  description        text,
  duration_seconds   numeric,
  copecart_order_id  text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hufi_voice_credit_tx_user ON public.hufi_voice_credit_transactions(user_id, created_at DESC);

ALTER TABLE public.hufi_voice_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hufi_voice_credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Nutzer sehen eigenes Voice-Guthaben" ON public.hufi_voice_credits;
CREATE POLICY "Nutzer sehen eigenes Voice-Guthaben"
  ON public.hufi_voice_credits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Nutzer sehen eigene Voice-Guthaben-Historie" ON public.hufi_voice_credit_transactions;
CREATE POLICY "Nutzer sehen eigene Voice-Guthaben-Historie"
  ON public.hufi_voice_credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Schreibzugriff nur über SECURITY DEFINER-Funktionen / Service-Role
-- (Edge Functions) — keine INSERT/UPDATE/DELETE-Policies für normale Nutzer.

-- ── Sicherstellen, dass die Zeile existiert & der Monats-Reset aktuell ist ────
CREATE OR REPLACE FUNCTION public.ensure_hufi_voice_credits_current(p_user_id uuid)
RETURNS public.hufi_voice_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hufi_voice_credits;
  v_default_base_cents integer := 600; -- 10 Min * 60 Sek * 1 Cent/Sek
  v_is_subscriber boolean;
BEGIN
  SELECT (subscription_status IN ('active', 'trialing', 'lifetime') AND NOT COALESCE(is_suspended, false))
    INTO v_is_subscriber
    FROM public.profiles WHERE id = p_user_id;

  INSERT INTO public.hufi_voice_credits (user_id, monthly_base_cents, monthly_balance_cents, monthly_reset_at)
    VALUES (
      p_user_id,
      CASE WHEN v_is_subscriber THEN v_default_base_cents ELSE 0 END,
      CASE WHEN v_is_subscriber THEN v_default_base_cents ELSE 0 END,
      now() + interval '1 month'
    )
    ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM public.hufi_voice_credits WHERE user_id = p_user_id FOR UPDATE;

  IF now() >= v_row.monthly_reset_at THEN
    UPDATE public.hufi_voice_credits
      SET monthly_base_cents    = CASE WHEN v_is_subscriber THEN v_default_base_cents ELSE 0 END,
          monthly_balance_cents = CASE WHEN v_is_subscriber THEN v_default_base_cents ELSE 0 END,
          monthly_reset_at      = now() + interval '1 month',
          updated_at            = now()
      WHERE user_id = p_user_id
      RETURNING * INTO v_row;

    INSERT INTO public.hufi_voice_credit_transactions (user_id, amount_cents, source, type, description)
      VALUES (p_user_id, v_row.monthly_balance_cents, 'monthly_base', 'monthly_reset', 'Monatliches Basis-Kontingent zurückgesetzt');
  END IF;

  RETURN v_row;
END;
$$;

-- ── Guthaben abfragen (für UI) ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_hufi_voice_credits(p_user_id uuid)
RETURNS public.hufi_voice_credits
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.ensure_hufi_voice_credits_current(p_user_id);
$$;

-- ── Verbrauch verbuchen: erst monthly_balance, dann purchased_balance ────────
CREATE OR REPLACE FUNCTION public.consume_hufi_voice_credit(
  p_user_id uuid,
  p_seconds numeric,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_cents_per_second integer := 1;
  v_cost_cents integer := GREATEST(CEIL(p_seconds * v_rate_cents_per_second), 0);
  v_row public.hufi_voice_credits;
  v_from_monthly integer;
  v_from_purchased integer;
  v_remaining integer;
BEGIN
  v_row := public.ensure_hufi_voice_credits_current(p_user_id);

  -- Abgelaufenes Zusatz-Guthaben zählt nicht mehr
  IF v_row.purchased_expires_at IS NOT NULL AND v_row.purchased_expires_at < now() AND v_row.purchased_balance_cents > 0 THEN
    INSERT INTO public.hufi_voice_credit_transactions (user_id, amount_cents, source, type, description)
      VALUES (p_user_id, -v_row.purchased_balance_cents, 'purchased', 'admin_adjustment', 'Zusatz-Guthaben abgelaufen');
    UPDATE public.hufi_voice_credits SET purchased_balance_cents = 0, updated_at = now()
      WHERE user_id = p_user_id RETURNING * INTO v_row;
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
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;

  IF v_from_monthly > 0 THEN
    INSERT INTO public.hufi_voice_credit_transactions (user_id, amount_cents, source, type, description, duration_seconds)
      VALUES (p_user_id, -v_from_monthly, 'monthly_base', 'usage', p_description, p_seconds);
  END IF;
  IF v_from_purchased > 0 THEN
    INSERT INTO public.hufi_voice_credit_transactions (user_id, amount_cents, source, type, description, duration_seconds)
      VALUES (p_user_id, -v_from_purchased, 'purchased', 'usage', p_description, p_seconds);
  END IF;

  RETURN jsonb_build_object(
    'cost_cents', v_cost_cents,
    'covered_cents', v_from_monthly + v_from_purchased,
    'fully_covered', v_remaining = 0,
    'monthly_balance_cents', v_row.monthly_balance_cents,
    'purchased_balance_cents', v_row.purchased_balance_cents
  );
END;
$$;

-- ── Zugekauftes Guthaben gutschreiben (CopeCart-Webhook) ──────────────────────
CREATE OR REPLACE FUNCTION public.add_purchased_voice_credits(
  p_user_id uuid,
  p_amount_cents integer,
  p_copecart_order_id text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS public.hufi_voice_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hufi_voice_credits;
  v_new_expiry timestamptz := now() + interval '12 months';
BEGIN
  v_row := public.ensure_hufi_voice_credits_current(p_user_id);

  UPDATE public.hufi_voice_credits
    SET purchased_balance_cents = purchased_balance_cents + p_amount_cents,
        purchased_expires_at    = GREATEST(COALESCE(purchased_expires_at, v_new_expiry), v_new_expiry),
        updated_at              = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;

  INSERT INTO public.hufi_voice_credit_transactions
      (user_id, amount_cents, source, type, description, copecart_order_id)
    VALUES (p_user_id, p_amount_cents, 'purchased', 'purchase', p_description, p_copecart_order_id);

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hufi_voice_credits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_hufi_voice_credit(uuid, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_purchased_voice_credits(uuid, integer, text, text) TO service_role;
