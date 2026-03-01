-- ================================================================
-- DATABASE HARDENING PART 2: Indexes + Statistics
-- ================================================================

-- Notifications unread
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id) WHERE is_read = false;

-- Messages by conversation ordered
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time
  ON public.messages(conversation_id, created_at DESC);

-- Horses active by owner
CREATE INDEX IF NOT EXISTS idx_horses_owner_active
  ON public.horses(owner_id) WHERE deleted_at IS NULL;

-- Invoices by provider and status
CREATE INDEX IF NOT EXISTS idx_invoices_provider_status
  ON public.invoices(provider_id, status);

-- Contacts by provider active
CREATE INDEX IF NOT EXISTS idx_contacts_provider_active
  ON public.contacts(provider_id) WHERE deleted_at IS NULL;

-- Employee assignments by employee (uses assigned_at, not appointment_date)
CREATE INDEX IF NOT EXISTS idx_emp_assignments_employee
  ON public.employee_assignments(employee_id, assigned_at DESC);

-- Hoof records by horse
CREATE INDEX IF NOT EXISTS idx_hoof_history_horse_date
  ON public.hoof_history(horse_id, created_at DESC);

-- Push subscriptions by user
CREATE INDEX IF NOT EXISTS idx_push_subs_user
  ON public.push_subscriptions(user_id);

-- Leads by provider
CREATE INDEX IF NOT EXISTS idx_leads_provider_created
  ON public.leads(provider_id, created_at DESC);

-- Reviews by provider visible
CREATE INDEX IF NOT EXISTS idx_reviews_provider_visible
  ON public.reviews(provider_id) WHERE is_approved = true AND is_visible = true;

-- Refresh statistics on key tables
ANALYZE public.appointments;
ANALYZE public.profiles;
ANALYZE public.horses;
ANALYZE public.invoices;
ANALYZE public.notifications;
ANALYZE public.messages;
ANALYZE public.contacts;
ANALYZE public.services;
ANALYZE public.access_grants;
ANALYZE public.employee_profiles;
