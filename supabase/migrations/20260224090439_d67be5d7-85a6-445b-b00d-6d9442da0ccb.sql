
-- 1. Enum für Preisgruppen
CREATE TYPE public.price_group AS ENUM ('standard', 'vip', 'grossstall', 'individuell');

-- 2. Preisgruppe auf profiles
ALTER TABLE public.profiles
ADD COLUMN price_group public.price_group NOT NULL DEFAULT 'standard';

-- 3. Enum für Zuschlag-Trigger
CREATE TYPE public.surcharge_trigger AS ENUM ('notfall', 'wochenende', 'anfahrt', 'schwieriges_pferd');
CREATE TYPE public.surcharge_type AS ENUM ('fix', 'prozent');

-- 4. Service-Preisüberschreibungen pro Preisgruppe
CREATE TABLE public.service_price_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price_group public.price_group NOT NULL,
  price NUMERIC NOT NULL,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, price_group, provider_id)
);

ALTER TABLE public.service_price_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider can manage own overrides"
ON public.service_price_overrides
FOR ALL
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Admins can view all overrides"
ON public.service_price_overrides
FOR SELECT
USING (public.is_admin(auth.uid()));

-- 5. Zuschlagsregeln
CREATE TABLE public.surcharge_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger public.surcharge_trigger NOT NULL,
  type public.surcharge_type NOT NULL DEFAULT 'fix',
  amount NUMERIC NOT NULL DEFAULT 0,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, trigger)
);

ALTER TABLE public.surcharge_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider can manage own surcharge rules"
ON public.surcharge_rules
FOR ALL
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Admins can view all surcharge rules"
ON public.surcharge_rules
FOR SELECT
USING (public.is_admin(auth.uid()));

-- 6. Zuschlag-Betrag auf Termin speichern (für Rechnung)
ALTER TABLE public.appointments
ADD COLUMN surcharge_amount NUMERIC DEFAULT 0,
ADD COLUMN surcharge_label TEXT;

-- 7. Index für Performance
CREATE INDEX idx_service_price_overrides_lookup 
ON public.service_price_overrides (service_id, price_group);

CREATE INDEX idx_surcharge_rules_provider 
ON public.surcharge_rules (provider_id, is_active);

CREATE INDEX idx_profiles_price_group 
ON public.profiles (price_group);
