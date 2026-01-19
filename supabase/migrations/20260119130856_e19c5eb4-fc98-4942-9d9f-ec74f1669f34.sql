-- RLS Policies für product_recipes
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recipes" ON public.product_recipes;
CREATE POLICY "Users can view own recipes"
  ON public.product_recipes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recipes" ON public.product_recipes;
CREATE POLICY "Users can insert own recipes"
  ON public.product_recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recipes" ON public.product_recipes;
CREATE POLICY "Users can update own recipes"
  ON public.product_recipes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recipes" ON public.product_recipes;
CREATE POLICY "Users can delete own recipes"
  ON public.product_recipes FOR DELETE
  USING (auth.uid() = user_id);

-- main_product_id Spalte hinzufügen falls fehlt
ALTER TABLE public.product_recipes ADD COLUMN IF NOT EXISTS main_product_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL;
ALTER TABLE public.product_recipes ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.product_recipes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.product_recipes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.product_recipes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- PRODUCT RECIPE ITEMS erstellen
CREATE TABLE IF NOT EXISTS public.product_recipe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.product_recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_recipe_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recipe items" ON public.product_recipe_items;
CREATE POLICY "Users can view own recipe items"
  ON public.product_recipe_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.product_recipes pr
    WHERE pr.id = product_recipe_items.recipe_id
    AND pr.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own recipe items" ON public.product_recipe_items;
CREATE POLICY "Users can insert own recipe items"
  ON public.product_recipe_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.product_recipes pr
    WHERE pr.id = product_recipe_items.recipe_id
    AND pr.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own recipe items" ON public.product_recipe_items;
CREATE POLICY "Users can update own recipe items"
  ON public.product_recipe_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.product_recipes pr
    WHERE pr.id = product_recipe_items.recipe_id
    AND pr.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete own recipe items" ON public.product_recipe_items;
CREATE POLICY "Users can delete own recipe items"
  ON public.product_recipe_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.product_recipes pr
    WHERE pr.id = product_recipe_items.recipe_id
    AND pr.user_id = auth.uid()
  ));

-- purchase_order_items Policies aktualisieren
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order items" ON public.purchase_order_items;
CREATE POLICY "Users can view own order items"
  ON public.purchase_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.order_id
    AND po.provider_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own order items" ON public.purchase_order_items;
CREATE POLICY "Users can insert own order items"
  ON public.purchase_order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.order_id
    AND po.provider_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own order items" ON public.purchase_order_items;
CREATE POLICY "Users can update own order items"
  ON public.purchase_order_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.order_id
    AND po.provider_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete own order items" ON public.purchase_order_items;
CREATE POLICY "Users can delete own order items"
  ON public.purchase_order_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.order_id
    AND po.provider_id = auth.uid()
  ));

-- Trigger für updated_at
DROP TRIGGER IF EXISTS update_product_recipes_updated_at ON public.product_recipes;
CREATE TRIGGER update_product_recipes_updated_at
  BEFORE UPDATE ON public.product_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();