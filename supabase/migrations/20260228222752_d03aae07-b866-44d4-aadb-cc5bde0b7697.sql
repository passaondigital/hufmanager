
-- ============================================================
-- 1. Extend billing_type enum with new billing models
-- ============================================================
ALTER TYPE public.billing_type ADD VALUE IF NOT EXISTS 'subscription';
ALTER TYPE public.billing_type ADD VALUE IF NOT EXISTS 'installment';
ALTER TYPE public.billing_type ADD VALUE IF NOT EXISTS 'hourly';
ALTER TYPE public.billing_type ADD VALUE IF NOT EXISTS 'session_card';
ALTER TYPE public.billing_type ADD VALUE IF NOT EXISTS 'tiered';
ALTER TYPE public.billing_type ADD VALUE IF NOT EXISTS 'early_bird';
ALTER TYPE public.billing_type ADD VALUE IF NOT EXISTS 'free';

-- ============================================================
-- 2. Extend services table for universal catalog
-- ============================================================

-- Item type: service, product_physical, product_digital, course, workshop, bundle
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'service';

-- Billing details
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT NULL; -- monthly, quarterly, yearly, one_time
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS installment_count integer DEFAULT NULL;
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS installment_amount numeric DEFAULT NULL;

-- Validity / capacity
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS validity_days integer DEFAULT NULL; -- e.g. session card valid for X days
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS session_count integer DEFAULT NULL; -- sessions in a card
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS capacity_limit integer DEFAULT NULL; -- max participants (workshop/course)
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS capacity_used integer DEFAULT 0;

-- Tiered / early-bird pricing
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS early_bird_price numeric DEFAULT NULL;
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS early_bird_deadline date DEFAULT NULL;
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS tier_config jsonb DEFAULT NULL; -- [{min_qty, max_qty, price}]

-- Product-specific
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS sku text DEFAULT NULL;
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT NULL;
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS digital_asset_url text DEFAULT NULL;
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

-- Bundle support
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS bundle_service_ids uuid[] DEFAULT NULL;
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS bundle_discount_percent numeric DEFAULT NULL;

-- Tax
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT NULL; -- override per item

COMMENT ON COLUMN public.services.item_type IS 'service, product_physical, product_digital, course, workshop, bundle';
COMMENT ON COLUMN public.services.billing_interval IS 'monthly, quarterly, yearly, one_time – for subscriptions/installments';
COMMENT ON COLUMN public.services.tier_config IS 'JSON array of {min_qty, max_qty, unit_price} for tiered pricing';

-- ============================================================
-- 3. Extend partner_services table similarly
-- ============================================================
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'service';
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'standard';
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS installment_count integer DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS installment_amount numeric DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS validity_days integer DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS session_count integer DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS capacity_limit integer DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS capacity_used integer DEFAULT 0;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS early_bird_price numeric DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS early_bird_deadline date DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS tier_config jsonb DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS sku text DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS digital_asset_url text DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS bundle_service_ids uuid[] DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS bundle_discount_percent numeric DEFAULT NULL;
ALTER TABLE public.partner_services
  ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT NULL;

-- ============================================================
-- 4. Index for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_services_item_type ON public.services(item_type);
CREATE INDEX IF NOT EXISTS idx_services_billing_type ON public.services(billing_type);
CREATE INDEX IF NOT EXISTS idx_partner_services_item_type ON public.partner_services(item_type);
