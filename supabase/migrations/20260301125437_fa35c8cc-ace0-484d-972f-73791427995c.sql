
-- Horse Diary Entries table
CREATE TABLE public.horse_diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'note' CHECK (category IN ('moment', 'concern', 'treatment', 'note')),
  text TEXT NOT NULL,
  photo_url TEXT,
  shared_with_provider BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- RLS: Only owner can see their own diary entries (unless shared with provider)
ALTER TABLE public.horse_diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own diary entries"
  ON public.horse_diary_entries
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Provider can view shared diary entries"
  ON public.horse_diary_entries
  FOR SELECT
  TO authenticated
  USING (
    shared_with_provider = true
    AND EXISTS (
      SELECT 1 FROM public.access_grants ag
      WHERE ag.client_id = horse_diary_entries.owner_id
        AND ag.provider_id = auth.uid()
        AND ag.is_active = true
        AND ag.status = 'active'
    )
  );

-- Index for fast lookups
CREATE INDEX idx_horse_diary_horse_id ON public.horse_diary_entries(horse_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_horse_diary_owner_id ON public.horse_diary_entries(owner_id) WHERE deleted_at IS NULL;

-- Invoice notification trigger
CREATE OR REPLACE FUNCTION public.create_invoice_notification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_client_name TEXT;
  v_provider_name TEXT;
  v_notification_exists BOOLEAN;
BEGIN
  -- Only notify if client_id is set
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get provider name
  SELECT COALESCE(bs.business_name, bs.owner_name, p.full_name, 'Dein Hufbearbeiter')
  INTO v_provider_name
  FROM public.profiles p
  LEFT JOIN public.business_settings bs ON bs.user_id = p.id
  WHERE p.id = NEW.provider_id;

  -- Idempotency: no duplicate within 5 min
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.client_id
      AND type = 'invoice_created'
      AND created_at > NOW() - INTERVAL '5 minutes'
      AND message LIKE '%' || COALESCE(NEW.invoice_number, '') || '%'
  ) INTO v_notification_exists;

  IF v_notification_exists THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.client_id,
    'Neue Rechnung von ' || v_provider_name,
    'Betrag: ' || TO_CHAR(NEW.total_amount, 'FM999G999D00') || ' € · Fällig: ' || COALESCE(TO_CHAR(NEW.due_date::date, 'DD.MM.YYYY'), 'k.A.'),
    'invoice_created',
    '/client-invoices'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_notification
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.create_invoice_notification();

-- Referral tracking trigger (notification when client shares provider profile)
CREATE OR REPLACE FUNCTION public.notify_provider_on_referral()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_client_name TEXT;
BEGIN
  SELECT COALESCE(full_name, 'Ein Kunde') INTO v_client_name
  FROM public.profiles WHERE id = NEW.referrer_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.provider_id,
    'Empfehlung erhalten 🎉',
    v_client_name || ' hat dein Profil weiterempfohlen!',
    'referral',
    '/kunden'
  );
  RETURN NEW;
END;
$$;

-- Referral log table
CREATE TABLE public.client_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  channel TEXT NOT NULL DEFAULT 'share',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can insert own referrals"
  ON public.client_referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Clients can view own referrals"
  ON public.client_referrals
  FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid());

CREATE TRIGGER trg_referral_notification
  AFTER INSERT ON public.client_referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_provider_on_referral();
