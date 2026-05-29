-- BHS Balance System: Pro-Pferd Abo-Tabelle
CREATE TABLE IF NOT EXISTS public.bhs_horse_subscriptions (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id                 UUID          NOT NULL REFERENCES public.horses(id) ON DELETE RESTRICT,
  provider_id              UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  client_id                UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  interval_weeks           INTEGER       NOT NULL CHECK (interval_weeks IN (4, 6, 8)),
  zone                     INTEGER       NOT NULL CHECK (zone IN (1, 2, 3)),
  monthly_price            NUMERIC(8,2)  NOT NULL,
  product_variant          TEXT          NOT NULL,  -- z.B. BHS_4W_Z1
  copecart_subscription_id TEXT,
  status                   TEXT          NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'active', 'paused', 'cancelled')),
  cancelled_by             TEXT          CHECK (cancelled_by IN ('client', 'provider', 'system')),
  cancellation_reason      TEXT,
  started_at               TIMESTAMPTZ,
  next_service_date        DATE,
  cancelled_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.bhs_horse_subscriptions ENABLE ROW LEVEL SECURITY;

-- Provider sieht alle eigenen Abos
CREATE POLICY "bhs_subs_provider_all" ON public.bhs_horse_subscriptions
  FOR ALL
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Client sieht und verwaltet nur seine eigenen Pferd-Abos
CREATE POLICY "bhs_subs_client_own" ON public.bhs_horse_subscriptions
  FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Index für häufige Abfragen
CREATE INDEX IF NOT EXISTS idx_bhs_subs_provider_status
  ON public.bhs_horse_subscriptions(provider_id, status);

CREATE INDEX IF NOT EXISTS idx_bhs_subs_client_horse
  ON public.bhs_horse_subscriptions(client_id, horse_id);

CREATE INDEX IF NOT EXISTS idx_bhs_subs_next_service
  ON public.bhs_horse_subscriptions(next_service_date)
  WHERE status = 'active';
