-- BHS Balance: Neukundentage pro Provider konfigurierbar
-- ISO-Wochentage: 1=Montag, 2=Dienstag, ..., 6=Samstag, 7=Sonntag
-- Standard: Montag (1) + Samstag (6)
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS new_client_days integer[] DEFAULT '{1,6}';
