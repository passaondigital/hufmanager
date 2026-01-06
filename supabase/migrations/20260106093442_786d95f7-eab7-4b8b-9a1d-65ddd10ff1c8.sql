-- Add min_stock threshold column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN min_stock INTEGER DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.inventory_items.min_stock IS 'Minimum stock threshold for alerts';