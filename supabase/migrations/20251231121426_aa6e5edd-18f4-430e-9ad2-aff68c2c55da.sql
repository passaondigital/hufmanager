-- =====================================================
-- PERFORMANCE INDEXES FOR SCALABLE SAAS ARCHITECTURE
-- =====================================================

-- Index on profiles for provider lookups
CREATE INDEX IF NOT EXISTS idx_profiles_created_by_provider_id 
ON public.profiles(created_by_provider_id) 
WHERE created_by_provider_id IS NOT NULL AND deleted_at IS NULL;

-- Index on conversations for provider and client lookups
CREATE INDEX IF NOT EXISTS idx_conversations_provider_id 
ON public.conversations(provider_id);

CREATE INDEX IF NOT EXISTS idx_conversations_client_id 
ON public.conversations(client_id);

-- Composite index for conversation lookups
CREATE INDEX IF NOT EXISTS idx_conversations_provider_client 
ON public.conversations(provider_id, client_id);

-- Index on messages for conversation lookups (high volume table)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON public.messages(conversation_id);

-- Index for unread message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread 
ON public.messages(conversation_id, is_read) 
WHERE is_read = false;

-- Index on horses for owner lookups
CREATE INDEX IF NOT EXISTS idx_horses_owner_id 
ON public.horses(owner_id) 
WHERE deleted_at IS NULL;

-- Index on access_grants for provider and client lookups
CREATE INDEX IF NOT EXISTS idx_access_grants_provider_id 
ON public.access_grants(provider_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_access_grants_client_id 
ON public.access_grants(client_id) 
WHERE is_active = true;

-- Composite index for access grant lookups
CREATE INDEX IF NOT EXISTS idx_access_grants_provider_client_active 
ON public.access_grants(provider_id, client_id) 
WHERE is_active = true;

-- Index on appointments for provider and date lookups
CREATE INDEX IF NOT EXISTS idx_appointments_provider_id 
ON public.appointments(provider_id);

CREATE INDEX IF NOT EXISTS idx_appointments_provider_date 
ON public.appointments(provider_id, date);

-- Index on notifications for user lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread 
ON public.notifications(user_id) 
WHERE is_read = false;

-- =====================================================
-- UNIQUE CONSTRAINT: PREVENT DUPLICATE CONVERSATIONS
-- =====================================================

-- Add unique constraint to prevent ghost/duplicate chats
-- First, let's check and clean any duplicates, then add constraint
DO $$
DECLARE
    dup_record RECORD;
BEGIN
    -- Find and delete duplicate conversations (keep the oldest one)
    FOR dup_record IN
        SELECT id FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (PARTITION BY provider_id, client_id ORDER BY created_at ASC) as rn
            FROM public.conversations
        ) sub
        WHERE rn > 1
    LOOP
        DELETE FROM public.conversations WHERE id = dup_record.id;
    END LOOP;
END $$;

-- Now add the unique constraint
ALTER TABLE public.conversations 
ADD CONSTRAINT uq_conversations_provider_client 
UNIQUE (provider_id, client_id);