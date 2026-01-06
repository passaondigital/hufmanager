-- Create global_products table (Admin-managed catalog)
CREATE TABLE public.global_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  shop_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_items table (User's stock)
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  global_product_id UUID REFERENCES public.global_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  image_url TEXT,
  current_stock INTEGER NOT NULL DEFAULT 0,
  price_sell DECIMAL(10,2),
  tax_rate DECIMAL(5,2) DEFAULT 19.00,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Global products: Everyone can read, only admins can write
CREATE POLICY "Anyone can view global products"
  ON public.global_products FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert global products"
  ON public.global_products FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update global products"
  ON public.global_products FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete global products"
  ON public.global_products FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Inventory items: Users can manage their own
CREATE POLICY "Users can view own inventory"
  ON public.inventory_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory"
  ON public.inventory_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory"
  ON public.inventory_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory"
  ON public.inventory_items FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_global_products_brand ON public.global_products(brand);
CREATE INDEX idx_global_products_category ON public.global_products(category);
CREATE INDEX idx_inventory_items_user_id ON public.inventory_items(user_id);

-- Add updated_at triggers
CREATE TRIGGER update_global_products_updated_at
  BEFORE UPDATE ON public.global_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();