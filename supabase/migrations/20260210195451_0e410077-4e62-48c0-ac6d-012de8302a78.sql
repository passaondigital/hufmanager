-- Insert module_office into global_feature_defaults (same pattern as module_team)
INSERT INTO public.global_feature_defaults (feature_key, feature_name, default_status, description)
VALUES ('module_office', 'Mein Office', 'disabled', 'Dokumente, Formulare & Vorlagen')
ON CONFLICT (feature_key) DO NOTHING;