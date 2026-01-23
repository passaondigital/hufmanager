-- ============================================
-- VEHICLE MODULE: Step 2 - Dependent tables
-- ============================================

-- Mileage logs (depends on provider_vehicles)
CREATE TABLE IF NOT EXISTS public.vehicle_mileage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.provider_vehicles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Odometer readings
  odometer_start INTEGER NOT NULL,
  odometer_end INTEGER,
  
  -- Photos as proof
  photo_start_url TEXT,
  photo_end_url TEXT,
  
  -- Trip details
  purpose TEXT,
  route_description TEXT,
  
  -- Linked entities
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_mileage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers manage own mileage logs" ON public.vehicle_mileage_logs;
CREATE POLICY "Providers manage own mileage logs"
ON public.vehicle_mileage_logs FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Provider documents (receipts, certificates, etc.)
CREATE TABLE IF NOT EXISTS public.provider_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'receipt', 'invoice', 'xray', 'certificate', 'insurance', 
    'contract', 'report', 'photo', 'video', 'other'
  )),
  
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Relations
  horse_id UUID REFERENCES public.horses(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.provider_vehicles(id) ON DELETE SET NULL,
  
  folder TEXT DEFAULT 'general',
  tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers manage own documents" ON public.provider_documents;
CREATE POLICY "Providers manage own documents"
ON public.provider_documents FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Add columns to work_sessions if missing
ALTER TABLE public.work_sessions ADD COLUMN IF NOT EXISTS mileage_log_id UUID REFERENCES public.vehicle_mileage_logs(id) ON DELETE SET NULL;
ALTER TABLE public.work_sessions ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 0;

-- Triggers
CREATE OR REPLACE TRIGGER update_vehicle_mileage_logs_updated_at
BEFORE UPDATE ON public.vehicle_mileage_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_provider_documents_updated_at
BEFORE UPDATE ON public.provider_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mileage_logs_provider ON public.vehicle_mileage_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_date ON public.vehicle_mileage_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_provider_documents_provider ON public.provider_documents(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_documents_type ON public.provider_documents(document_type);