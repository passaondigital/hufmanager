-- Fix: validate_horse_audit_action_type rejects TG_OP values (INSERT/UPDATE/DELETE)
-- The log_horse_audit() trigger uses TG_OP as action_type, but the validator doesn't allow them.
-- Add standard DB operation types to the allowed list.

CREATE OR REPLACE FUNCTION public.validate_horse_audit_action_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action_type NOT IN (
    'INSERT', 'UPDATE', 'DELETE',
    'view_basic', 'view_medical', 'view_hoof_history', 'view_documents',
    'view_vaccinations', 'view_insurance', 'upload_document', 'upload_photo',
    'upload_xray', 'add_treatment_note', 'add_vaccination', 'add_deworming',
    'edit_horse', 'grant_access', 'revoke_access', 'create_appointment',
    'transfer_initiated', 'transfer_completed', 'status_changed',
    'export_data', 'authority_request'
  ) THEN
    RAISE EXCEPTION 'Invalid audit action_type: %', NEW.action_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;