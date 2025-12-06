-- Add length constraints to leads table text fields
ALTER TABLE public.leads
ADD CONSTRAINT leads_postal_code_length CHECK (length(postal_code) <= 10),
ADD CONSTRAINT leads_phone_length CHECK (length(phone) <= 50),
ADD CONSTRAINT leads_name_length CHECK (length(name) <= 100),
ADD CONSTRAINT leads_email_length CHECK (length(email) <= 255),
ADD CONSTRAINT leads_message_length CHECK (length(message) <= 5000),
ADD CONSTRAINT leads_lead_type_length CHECK (length(lead_type) <= 50),
ADD CONSTRAINT leads_source_length CHECK (length(source) <= 50),
ADD CONSTRAINT leads_status_length CHECK (length(status) <= 50);