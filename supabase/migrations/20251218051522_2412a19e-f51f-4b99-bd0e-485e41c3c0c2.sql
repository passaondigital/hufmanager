-- Add CHECK constraints to leads table for enum validation
ALTER TABLE public.leads
ADD CONSTRAINT leads_lead_type_valid 
  CHECK (lead_type IN ('termin', 'notfall', 'frage')),
ADD CONSTRAINT leads_source_valid 
  CHECK (source IS NULL OR source IN ('chatbot', 'landingpage', 'app_service_request', 'client_app', 'manual', 'formular', 'manuell', 'import')),
ADD CONSTRAINT leads_status_valid 
  CHECK (status IN ('neu', 'kontaktiert', 'gewonnen', 'verloren', 'spam'));