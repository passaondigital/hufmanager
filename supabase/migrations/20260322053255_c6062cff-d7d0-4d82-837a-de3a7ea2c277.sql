
-- E-Mail Marketing Module: All 6 tables + RLS + Triggers

CREATE TABLE public.email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.email_signup_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Anmeldeformular',
  slug TEXT NOT NULL UNIQUE,
  fields_config JSONB NOT NULL DEFAULT '{"email": true, "first_name": false, "last_name": false, "postal_code": false}'::jsonb,
  heading_text TEXT DEFAULT 'Newsletter abonnieren',
  button_text TEXT DEFAULT 'Anmelden',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  postal_code TEXT,
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'signup_form', 'landingpage_sync', 'import')),
  tags TEXT[] DEFAULT '{}',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_id, email)
);

CREATE TABLE public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID REFERENCES public.email_lists(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  sender_name TEXT,
  content_html TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  stats_sent INTEGER DEFAULT 0,
  stats_opened INTEGER DEFAULT 0,
  stats_clicked INTEGER DEFAULT 0,
  stats_bounced INTEGER DEFAULT 0,
  stats_unsubscribed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID REFERENCES public.email_lists(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'list_add' CHECK (trigger_type IN ('list_add', 'date_reached', 'manual')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.email_automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.email_automations(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL DEFAULT 'email' CHECK (step_type IN ('email', 'delay')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  delay_value INTEGER DEFAULT 0,
  delay_unit TEXT DEFAULT 'days' CHECK (delay_unit IN ('hours', 'days', 'weeks')),
  subject TEXT,
  content_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_signup_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own lists" ON public.email_lists FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Admin can read all lists" ON public.email_lists FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Owner can manage own forms" ON public.email_signup_forms FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Public can read forms" ON public.email_signup_forms FOR SELECT USING (true);

CREATE POLICY "Owner can manage subscribers" ON public.email_subscribers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.email_lists WHERE id = email_subscribers.list_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.email_lists WHERE id = email_subscribers.list_id AND owner_id = auth.uid()));
CREATE POLICY "Public can subscribe via forms" ON public.email_subscribers FOR INSERT
  WITH CHECK (source = 'signup_form' AND EXISTS (SELECT 1 FROM public.email_signup_forms sf WHERE sf.list_id = email_subscribers.list_id));
CREATE POLICY "Admin can read all subscribers" ON public.email_subscribers FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Owner can manage own campaigns" ON public.email_campaigns FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Admin can read all campaigns" ON public.email_campaigns FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Owner can manage own automations" ON public.email_automations FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Admin can read all automations" ON public.email_automations FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Owner can manage automation steps" ON public.email_automation_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM public.email_automations WHERE id = email_automation_steps.automation_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.email_automations WHERE id = email_automation_steps.automation_id AND owner_id = auth.uid()));
CREATE POLICY "Admin can read all steps" ON public.email_automation_steps FOR SELECT USING (public.is_admin(auth.uid()));

CREATE TRIGGER set_email_lists_updated_at BEFORE UPDATE ON public.email_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_email_automations_updated_at BEFORE UPDATE ON public.email_automations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_email_signup_forms_updated_at BEFORE UPDATE ON public.email_signup_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
