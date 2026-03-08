
-- Add new columns to office_documents
ALTER TABLE office_documents
ADD COLUMN IF NOT EXISTS horse_name TEXT,
ADD COLUMN IF NOT EXISTS color_tag TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_type TEXT;

-- Add new columns to office_templates  
ALTER TABLE office_templates
ADD COLUMN IF NOT EXISTS use_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT now();
