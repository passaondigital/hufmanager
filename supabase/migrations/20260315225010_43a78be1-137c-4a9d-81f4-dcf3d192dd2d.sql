-- 1. Add is_initial_assessment to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_initial_assessment BOOLEAN DEFAULT false;

-- 2. Horse intake history for first assessments
CREATE TABLE IF NOT EXISTS horse_intake_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID REFERENCES horses(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  ownership_duration TEXT,
  previous_farrier TEXT,
  trimming_interval TEXT,
  current_hoof_protection TEXT,
  known_conditions TEXT[] DEFAULT '{}',
  lameness_history TEXT,
  xrays_available BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE horse_intake_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider manages own intake" ON horse_intake_history FOR ALL USING (provider_id = auth.uid());
CREATE POLICY "Horse owner can view intake" ON horse_intake_history FOR SELECT USING (
  horse_id IN (SELECT id FROM horses WHERE owner_id = auth.uid())
);

-- 3. Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  interval_weeks INTEGER DEFAULT 8,
  price_monthly DECIMAL(10,2) NOT NULL,
  max_horses INTEGER DEFAULT 1,
  includes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider manages own plans" ON subscription_plans FOR ALL USING (provider_id = auth.uid());
CREATE POLICY "Public can view active plans" ON subscription_plans FOR SELECT USING (is_active = true);

-- 4. Client subscriptions
CREATE TABLE IF NOT EXISTS client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
  client_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  horse_ids UUID[] NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  next_appointment_due TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider and client see subscriptions" ON client_subscriptions FOR ALL USING (provider_id = auth.uid() OR client_id = auth.uid());

-- 5. Booking waitlist
CREATE TABLE IF NOT EXISTS booking_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  client_id UUID NOT NULL,
  horse_id UUID REFERENCES horses(id) NOT NULL,
  preference TEXT DEFAULT 'next_available' CHECK (preference IN ('next_available', 'specific_week')),
  preferred_week DATE,
  notes TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'booked', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE booking_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider and client manage waitlist" ON booking_waitlist FOR ALL USING (provider_id = auth.uid() OR client_id = auth.uid());

-- 6. Email preferences on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_preferences TEXT DEFAULT 'all';