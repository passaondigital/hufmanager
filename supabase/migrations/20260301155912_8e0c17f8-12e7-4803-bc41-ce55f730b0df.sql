-- ================================================================
-- DATABASE HARDENING: NOT NULL + Validation Triggers + Cascades
-- ================================================================

-- PART 1: NOT NULL
ALTER TABLE public.appointments ALTER COLUMN provider_id SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN status SET DEFAULT 'planned';
ALTER TABLE public.invoices ALTER COLUMN provider_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.services ALTER COLUMN provider_id SET NOT NULL;

-- PART 2: Validation Triggers

CREATE OR REPLACE FUNCTION public.validate_appointment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('planned', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'requested') THEN
    RAISE EXCEPTION 'Invalid appointment status: %', NEW.status;
  END IF;
  IF NEW.price IS NOT NULL AND NEW.price < 0 THEN
    RAISE EXCEPTION 'Price cannot be negative';
  END IF;
  IF NEW.duration IS NOT NULL AND (NEW.duration < 1 OR NEW.duration > 480) THEN
    RAISE EXCEPTION 'Duration must be between 1 and 480 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_appointment
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_status();

CREATE OR REPLACE FUNCTION public.validate_invoice_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'credited') THEN
    RAISE EXCEPTION 'Invalid invoice status: %', NEW.status;
  END IF;
  IF NEW.total_amount < 0 THEN
    RAISE EXCEPTION 'Invoice total amount cannot be negative';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_invoice
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_data();

CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.email;
  END IF;
  IF NEW.phone IS NOT NULL AND char_length(NEW.phone) > 30 THEN
    RAISE EXCEPTION 'Phone number too long (max 30 chars)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_profile
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_data();

CREATE OR REPLACE FUNCTION public.validate_service_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.base_price IS NOT NULL AND NEW.base_price < 0 THEN
    RAISE EXCEPTION 'Service price cannot be negative';
  END IF;
  IF NEW.duration IS NOT NULL AND (NEW.duration < 1 OR NEW.duration > 480) THEN
    RAISE EXCEPTION 'Service duration must be between 1 and 480 minutes';
  END IF;
  IF NEW.name IS NOT NULL AND char_length(TRIM(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Service name cannot be empty';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_service
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_data();

CREATE OR REPLACE FUNCTION public.validate_horse_data()
RETURNS TRIGGER AS $$
BEGIN
  IF char_length(TRIM(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Horse name cannot be empty';
  END IF;
  IF NEW.birth_year IS NOT NULL AND (NEW.birth_year < 1980 OR NEW.birth_year > EXTRACT(YEAR FROM CURRENT_DATE)::int) THEN
    RAISE EXCEPTION 'Invalid birth year: %', NEW.birth_year;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_horse
  BEFORE INSERT OR UPDATE ON public.horses
  FOR EACH ROW EXECUTE FUNCTION public.validate_horse_data();

CREATE OR REPLACE FUNCTION public.validate_contact_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid contact email: %', NEW.email;
  END IF;
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name := TRIM(regexp_replace(NEW.full_name, '<[^>]*>', '', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_contact
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.validate_contact_data();

CREATE OR REPLACE FUNCTION public.validate_expense_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount < 0 THEN
    RAISE EXCEPTION 'Expense amount cannot be negative';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_expense
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.validate_expense_data();

-- PART 3: Updated_at triggers for all tables missing them
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
  trigger_exists BOOLEAN;
BEGIN
  FOR tbl IN 
    SELECT c.table_name 
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.column_name = 'updated_at' AND c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND event_object_table = tbl 
      AND action_statement LIKE '%update_updated_at%'
    ) INTO trigger_exists;
    
    IF NOT trigger_exists THEN
      EXECUTE format(
        'CREATE TRIGGER trg_update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;

-- PART 4: Soft-delete cascade
CREATE OR REPLACE FUNCTION public.cascade_provider_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'provider') THEN
      UPDATE public.access_grants SET is_active = false, revoked_at = NOW()
      WHERE provider_id = NEW.id AND is_active = true;
      
      UPDATE public.appointments SET status = 'cancelled'
      WHERE provider_id = NEW.id AND date >= CURRENT_DATE AND status NOT IN ('cancelled', 'completed');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_cascade_provider_soft_delete
  AFTER UPDATE OF deleted_at ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.cascade_provider_soft_delete();
