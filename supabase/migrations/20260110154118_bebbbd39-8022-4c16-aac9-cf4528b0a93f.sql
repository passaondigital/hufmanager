-- Add payment_method column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN payment_method text CHECK (payment_method IN ('Überweisung', 'Bar', 'PayPal'));