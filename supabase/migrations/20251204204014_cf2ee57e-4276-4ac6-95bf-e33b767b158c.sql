-- Create services table
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Standard',
  base_price numeric NOT NULL DEFAULT 0,
  duration integer DEFAULT 60,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own services" ON public.services
FOR ALL USING (has_role(auth.uid(), 'provider'));

CREATE POLICY "Anyone can view active services" ON public.services
FOR SELECT USING (is_active = true);

-- Create offers table
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric,
  price_type text DEFAULT 'fest',
  features text[] DEFAULT '{}',
  image_url text,
  is_active boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own offers" ON public.offers
FOR ALL USING (has_role(auth.uid(), 'provider'));

CREATE POLICY "Anyone can view active offers" ON public.offers
FOR SELECT USING (is_active = true);

-- Create feedbacks table
CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text text,
  source text DEFAULT 'intern',
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage feedbacks" ON public.feedbacks
FOR ALL USING (has_role(auth.uid(), 'provider'));

CREATE POLICY "Anyone can view featured feedbacks" ON public.feedbacks
FOR SELECT USING (is_featured = true);

-- Create business_settings table
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name text,
  owner_name text,
  email text,
  phone text,
  address text,
  tax_number text,
  logo_url text,
  subdomain text,
  custom_domain text,
  hero_headline text,
  about_text text,
  accept_new_customers boolean DEFAULT true,
  primary_color text DEFAULT '#d97706',
  stripe_public_key text,
  copecart_vendor_id text,
  paypal_link text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings" ON public.business_settings
FOR ALL USING (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO public.services (name, description, category, base_price, duration, is_active) VALUES
('Barhufbearbeitung', 'Professionelle Barhufpflege für gesunde, natürliche Hufe', 'Standard', 65, 45, true),
('Hufbeschlag (vorne)', 'Beschlag der Vorderhufe mit Standardeisen', 'Beschlag', 80, 60, true),
('Hufbeschlag (komplett)', 'Vollständiger Beschlag aller vier Hufe', 'Beschlag', 140, 90, true),
('Korrektur-Beschlag', 'Orthopädischer Spezialbeschlag bei Fehlstellungen', 'Spezial', 180, 120, true);

INSERT INTO public.offers (title, description, price, price_type, features, is_active, sort_order) VALUES
('Barhufbearbeitung', 'Professionelle Barhufpflege für gesunde Hufe. Inklusive Beratung zur optimalen Hufgesundheit.', 65, 'fest', ARRAY['Ausschneiden', 'Raspeln', 'Strahlfurchen reinigen', 'Beratung'], true, 1),
('Hufbeschlag', 'Individuell angepasster Hufbeschlag mit hochwertigen Materialien.', 120, 'ab', ARRAY['Hufeisen nach Maß', 'Nieten & Nageln', 'Korrektur bei Bedarf', 'Nachkontrolle'], true, 2),
('Korrektur-Beschlag', 'Spezieller orthopädischer Beschlag bei Hufproblemen und Fehlstellungen.', NULL, 'auf_anfrage', ARRAY['Analyse der Fehlstellung', 'Individueller Plan', 'Spezialhufeisen', 'Verlaufskontrolle'], false, 3);

INSERT INTO public.feedbacks (customer_name, rating, text, source, is_featured) VALUES
('Anna Schmidt', 5, 'Herr Hufeisen ist ein absoluter Profi! Meine Pferde sind immer bestens versorgt.', 'intern', true),
('Thomas Müller', 5, 'Kompetent, pünktlich und sehr einfühlsam mit den Pferden. Kann ich nur weiterempfehlen!', 'google', true),
('Maria Weber', 4, 'Gute Arbeit, faire Preise. Einziger Nachteil: manchmal schwer einen Termin zu bekommen.', 'intern', false);