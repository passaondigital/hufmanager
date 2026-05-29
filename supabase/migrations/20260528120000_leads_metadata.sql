-- BHS Balance: Zusatzfelder für Leads aus der öffentlichen Landing Page
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
