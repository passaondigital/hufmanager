-- Create offer_materials table for recipe ingredients
CREATE TABLE public.offer_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(offer_id, inventory_item_id)
);

-- Add new columns to offers table
ALTER TABLE public.offers 
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS recommended_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_deduct BOOLEAN DEFAULT true;

-- Enable RLS on offer_materials
ALTER TABLE public.offer_materials ENABLE ROW LEVEL SECURITY;

-- Providers can manage their own offer materials (via offer ownership)
CREATE POLICY "Providers can view own offer materials" 
ON public.offer_materials 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.offers o 
    WHERE o.id = offer_materials.offer_id 
    AND o.provider_id = auth.uid()
  )
);

CREATE POLICY "Providers can insert own offer materials" 
ON public.offer_materials 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.offers o 
    WHERE o.id = offer_materials.offer_id 
    AND o.provider_id = auth.uid()
  )
);

CREATE POLICY "Providers can update own offer materials" 
ON public.offer_materials 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.offers o 
    WHERE o.id = offer_materials.offer_id 
    AND o.provider_id = auth.uid()
  )
);

CREATE POLICY "Providers can delete own offer materials" 
ON public.offer_materials 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.offers o 
    WHERE o.id = offer_materials.offer_id 
    AND o.provider_id = auth.uid()
  )
);

-- Add price_purchase (EK) to inventory_items for margin calculation
ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS price_purchase NUMERIC DEFAULT 0;

-- Create trigger for updated_at on offer_materials
CREATE TRIGGER update_offer_materials_updated_at
BEFORE UPDATE ON public.offer_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();