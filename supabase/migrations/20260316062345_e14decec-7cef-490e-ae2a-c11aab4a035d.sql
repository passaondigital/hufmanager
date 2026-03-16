
-- Add trial/account lifecycle columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'trial' 
    CHECK (account_status IN ('trial', 'active', 'suspended', 'expired', 'deleted')),
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- Notify admin when new user registers
CREATE OR REPLACE FUNCTION notify_admin_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for all admins
  INSERT INTO notifications (user_id, type, title, message, data, created_at)
  SELECT ur.user_id, 'new_user_registered',
    'Neuer Nutzer registriert',
    'Ein neuer Nutzer hat sich registriert: ' || COALESCE(NEW.display_name, NEW.email, 'Unbekannt'),
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'role', NEW.role,
      'display_name', NEW.display_name,
      'created_at', NEW.created_at
    ),
    now()
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_new_profile_created ON profiles;
CREATE TRIGGER on_new_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_user();

-- Update existing profiles with trial dates
UPDATE profiles 
SET trial_started_at = created_at,
    trial_ends_at = created_at + interval '30 days',
    account_status = CASE 
      WHEN created_at < now() - interval '30 days' THEN 'expired'
      ELSE 'trial'
    END
WHERE account_status IS NULL OR account_status = 'trial';
