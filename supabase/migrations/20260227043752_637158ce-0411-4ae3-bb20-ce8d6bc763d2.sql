
-- Deaktiviere den falschen Access Grant (zum anderen Provider)
UPDATE access_grants 
SET is_active = false, revoked_at = NOW(), status = 'revoked'
WHERE id = 'cb7981bd-3b75-4db4-892c-502cf3ea617c';

-- Setze created_by_provider_id auf Jennifer Böhler
UPDATE profiles 
SET created_by_provider_id = '715f653b-20df-4977-a56f-a17961083cb5'
WHERE id = '1739f9bd-dad2-4b78-bab7-c51d6b6c22c9';
