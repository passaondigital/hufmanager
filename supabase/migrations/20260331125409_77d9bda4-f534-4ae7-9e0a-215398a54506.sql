-- Fix 1: Jenny Böhler payment record missing from admin_provider_payments
INSERT INTO public.admin_provider_payments (provider_id, amount, plan_name, payment_method, payment_date, period_start, period_end, notes)
VALUES (
  '715f653b-20df-4977-a56f-a17961083cb5',
  199,
  'pro',
  'manual_cash',
  '2026-01-16',
  '2026-01-16',
  '2027-01-14',
  'Sonderangebot Vertrauensbonus. 199€/Jahr einmalig bezahlt am 16.01.2026.'
);

-- Fix 2: Update account_status for Jenny (has valid access until 2027-01-14)
UPDATE public.profiles
SET account_status = 'active'
WHERE id = '715f653b-20df-4977-a56f-a17961083cb5'
  AND access_valid_until > now();

-- Fix 3: Update account_status for Heiko (has valid access until 2027-02-27)  
UPDATE public.profiles
SET account_status = 'active'
WHERE id = 'aa66b911-8ccc-46d1-8bc5-abab9a5caf6d'
  AND access_valid_until > now();