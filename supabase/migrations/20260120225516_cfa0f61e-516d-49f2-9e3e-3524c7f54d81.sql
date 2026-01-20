-- =============================================
-- 1. HOOF ENTRIES TABLE (for Hoof History)
-- =============================================

CREATE TABLE public.hoof_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'treatment',
  description TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.hoof_entries ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own horses' hoof entries
CREATE POLICY "Owners can view hoof entries for their horses"
ON public.hoof_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.horses h
    WHERE h.id = hoof_entries.horse_id
    AND h.owner_id = auth.uid()
    AND h.deleted_at IS NULL
  )
);

CREATE POLICY "Owners can insert hoof entries for their horses"
ON public.hoof_entries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.horses h
    WHERE h.id = hoof_entries.horse_id
    AND h.owner_id = auth.uid()
    AND h.deleted_at IS NULL
  )
);

CREATE POLICY "Owners can update hoof entries for their horses"
ON public.hoof_entries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.horses h
    WHERE h.id = hoof_entries.horse_id
    AND h.owner_id = auth.uid()
    AND h.deleted_at IS NULL
  )
);

CREATE POLICY "Owners can delete hoof entries for their horses"
ON public.hoof_entries FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.horses h
    WHERE h.id = hoof_entries.horse_id
    AND h.owner_id = auth.uid()
    AND h.deleted_at IS NULL
  )
);

-- Providers with access can manage hoof entries
CREATE POLICY "Providers can view hoof entries for accessible horses"
ON public.hoof_entries FOR SELECT
USING (
  public.has_role(auth.uid(), 'provider'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.horses h
    JOIN public.access_grants ag ON ag.client_id = h.owner_id
    WHERE h.id = hoof_entries.horse_id
    AND ag.provider_id = auth.uid()
    AND ag.is_active = true
    AND h.deleted_at IS NULL
  )
);

CREATE POLICY "Providers can insert hoof entries for accessible horses"
ON public.hoof_entries FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'provider'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.horses h
    JOIN public.access_grants ag ON ag.client_id = h.owner_id
    WHERE h.id = hoof_entries.horse_id
    AND ag.provider_id = auth.uid()
    AND ag.is_active = true
    AND h.deleted_at IS NULL
  )
);

CREATE POLICY "Providers can update hoof entries for accessible horses"
ON public.hoof_entries FOR UPDATE
USING (
  public.has_role(auth.uid(), 'provider'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.horses h
    JOIN public.access_grants ag ON ag.client_id = h.owner_id
    WHERE h.id = hoof_entries.horse_id
    AND ag.provider_id = auth.uid()
    AND ag.is_active = true
    AND h.deleted_at IS NULL
  )
);

CREATE POLICY "Providers can delete hoof entries for accessible horses"
ON public.hoof_entries FOR DELETE
USING (
  public.has_role(auth.uid(), 'provider'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.horses h
    JOIN public.access_grants ag ON ag.client_id = h.owner_id
    WHERE h.id = hoof_entries.horse_id
    AND ag.provider_id = auth.uid()
    AND ag.is_active = true
    AND h.deleted_at IS NULL
  )
);

-- Admins can manage all hoof entries
CREATE POLICY "Admins can manage all hoof entries"
ON public.hoof_entries FOR ALL
USING (public.is_admin(auth.uid()));

-- =============================================
-- 2. ADD recall_interval_weeks to horses table
-- =============================================
ALTER TABLE public.horses 
ADD COLUMN IF NOT EXISTS recall_interval_weeks INTEGER DEFAULT 6;

-- =============================================
-- 3. STORAGE BUCKET for expense receipts
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for expense-receipts bucket
CREATE POLICY "Users can upload their own expense receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'expense-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own expense receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'expense-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own expense receipts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'expense-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own expense receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'expense-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- 4. INDEXES for better query performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_hoof_entries_horse_id ON public.hoof_entries(horse_id);
CREATE INDEX IF NOT EXISTS idx_hoof_entries_date ON public.hoof_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_horses_recall_interval ON public.horses(recall_interval_weeks);