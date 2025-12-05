-- Create leads table for website inquiries
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  lead_type TEXT NOT NULL DEFAULT 'termin',
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  name TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'neu',
  source TEXT DEFAULT 'chatbot',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can create leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Providers can view own leads" 
ON public.leads 
FOR SELECT 
USING (auth.uid() = provider_id);

CREATE POLICY "Providers can update own leads" 
ON public.leads 
FOR UPDATE 
USING (auth.uid() = provider_id);

CREATE POLICY "Providers can delete own leads" 
ON public.leads 
FOR DELETE 
USING (auth.uid() = provider_id);

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();