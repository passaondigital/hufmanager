Worker Secrets — was du setzen musst

Für den Collage-Worker benötigst du folgende Secrets (GitHub Actions / PaaS):

- SUPABASE_URL — die URL deiner Supabase-Instanz (z. B. https://xyz.supabase.co)
- SUPABASE_SERVICE_ROLE_KEY — Supabase Service Role Key (nur serverseitig verwenden)
- SENTRY_DSN — (optional) DSN für Sentry, falls du Fehler-Tracking nutzen willst
- GHCR_TOKEN — (optional) persönliches Token zum Pushen ins GHCR, falls nötig (Actions kann GITHUB_TOKEN verwenden)

So setzt du GitHub Actions Secrets:
1. Gehe zu Repository → Settings → Secrets and variables → Actions → New repository secret
2. Name = SUPABASE_URL, Value = https://xyz.supabase.co
3. Name = SUPABASE_SERVICE_ROLE_KEY, Value = <service_role_key>
4. Optional: Name = SENTRY_DSN, Value = <dsn>

Hinweis: Der Service-Role Key hat volle Rechte – behandle ihn vertraulich und gib ihn nur im Secret-Manager an vertrauenswürdige Services weiter.