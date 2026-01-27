-- Create sequence for invoice numbers (resets yearly via function)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Create table to track yearly invoice counters per provider
CREATE TABLE IF NOT EXISTS invoice_number_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id, year)
);

-- Enable RLS
ALTER TABLE invoice_number_counters ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_number_counters
CREATE POLICY "Users can view their own counters"
ON invoice_number_counters FOR SELECT
USING (auth.uid() = provider_id);

CREATE POLICY "Users can insert their own counters"
ON invoice_number_counters FOR INSERT
WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Users can update their own counters"
ON invoice_number_counters FOR UPDATE
USING (auth.uid() = provider_id);

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_provider_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_next_number INTEGER;
  v_invoice_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Insert or update the counter for this provider/year
  INSERT INTO invoice_number_counters (provider_id, year, last_number)
  VALUES (p_provider_id, v_year, 1)
  ON CONFLICT (provider_id, year)
  DO UPDATE SET 
    last_number = invoice_number_counters.last_number + 1,
    updated_at = now()
  RETURNING last_number INTO v_next_number;
  
  -- Format: RE-2026-0001
  v_invoice_number := 'RE-' || v_year::TEXT || '-' || LPAD(v_next_number::TEXT, 4, '0');
  
  RETURN v_invoice_number;
END;
$$;

-- Add multi-horse support to appointments
-- Create junction table for appointments with multiple horses
CREATE TABLE IF NOT EXISTS appointment_horses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  service_type TEXT,
  price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, horse_id)
);

-- Enable RLS on appointment_horses
ALTER TABLE appointment_horses ENABLE ROW LEVEL SECURITY;

-- RLS policies for appointment_horses (inherit from appointments)
CREATE POLICY "Users can view appointment horses they have access to"
ON appointment_horses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.id = appointment_horses.appointment_id 
    AND (a.provider_id = auth.uid() OR a.client_id = auth.uid())
  )
);

CREATE POLICY "Providers can insert appointment horses"
ON appointment_horses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.id = appointment_horses.appointment_id 
    AND a.provider_id = auth.uid()
  )
);

CREATE POLICY "Providers can update appointment horses"
ON appointment_horses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.id = appointment_horses.appointment_id 
    AND a.provider_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete appointment horses"
ON appointment_horses FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.id = appointment_horses.appointment_id 
    AND a.provider_id = auth.uid()
  )
);

-- Add batch invoice support - link multiple appointments to one invoice
CREATE TABLE IF NOT EXISTS invoice_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE SET NULL,
  line_description TEXT,
  line_amount NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, appointment_id)
);

-- Enable RLS on invoice_appointments
ALTER TABLE invoice_appointments ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_appointments
CREATE POLICY "Users can view their invoice appointments"
ON invoice_appointments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = invoice_appointments.invoice_id 
    AND i.provider_id = auth.uid()
  )
);

CREATE POLICY "Users can insert invoice appointments"
ON invoice_appointments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = invoice_appointments.invoice_id 
    AND i.provider_id = auth.uid()
  )
);

CREATE POLICY "Users can delete invoice appointments"
ON invoice_appointments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = invoice_appointments.invoice_id 
    AND i.provider_id = auth.uid()
  )
);

-- Add is_multi_horse flag to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_multi_horse BOOLEAN DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointment_horses_appointment ON appointment_horses(appointment_id);
CREATE INDEX IF NOT EXISTS idx_invoice_appointments_invoice ON invoice_appointments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_number_counters_provider_year ON invoice_number_counters(provider_id, year);