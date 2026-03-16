-- Add client_type and business verification fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'private' 
    CHECK (client_type IN ('private', 'business')),
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT 
    CHECK (business_type IN (
      'pension', 'school', 'training', 'breeding', 
      'club', 'therapy', 'other'
    )),
  ADD COLUMN IF NOT EXISTS business_address JSONB,
  ADD COLUMN IF NOT EXISTS business_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS is_verified_business BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_document_url TEXT,
  ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none'
    CHECK (verification_status IN (
      'none', 'pending', 'approved', 'rejected', 'resubmitted'
    )),
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Update account_status check to include pending_verification
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_account_status_check 
  CHECK (account_status IN ('trial', 'active', 'suspended', 'expired', 'pending_verification', 'verification_rejected'));

-- Storage bucket for verification documents  
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for verification-docs bucket
CREATE POLICY "Users can upload own verification docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own verification docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can view all verification docs
CREATE POLICY "Admins can view all verification docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'verification-docs' AND public.is_admin(auth.uid()));