-- FINAL ACCEPTANCE P0 (Tenant), Variante 3: serverseitige Grant-Unterdrückung
-- VOR auth.admin.createUser() über einen DB-gestützten Pending-Invite-Vertrag.
--
-- ── Warum der bisherige Marker nicht funktioniert ───────────────────────────
-- 20260917155000 hat den generischen "erster Provider"-Fallback in
-- auto_assign_client_to_provider() über
-- auth.users.raw_app_meta_data->>'invited_by_provider_id' unterdrückt.
--
-- Live gegen echtes GoTrue v2.196.0 auf Staging gemessen (2026-09-20): GoTrue
-- schreibt custom app_metadata NICHT im selben Statement wie den
-- auth.users-INSERT, sondern in einem späteren Schritt. Die Triggerkette
--
--   INSERT auth.users
--     -> on_auth_user_created -> handle_new_user()
--          -> INSERT public.user_roles
--               -> auto_assign_client_to_provider()
--
-- läuft also vollständig ab, BEVOR der Marker existiert. Eine Probe, die in
-- genau diesem Trigger raw_app_meta_data protokolliert hat, sah für einen
-- über die Admin-API mit app_metadata angelegten Nutzer:
--
--   {"provider": "email", "providers": ["email"]}      <- Marker fehlt
--
-- während dieselbe Zeile nach Rückkehr des Admin-Calls den Marker enthielt.
-- Gegenprobe: ein einzelnes INSERT INTO auth.users, das raw_app_meta_data
-- bereits mitbringt, wird korrekt unterdrückt. Die SQL-Logik war richtig, die
-- Annahme über den Schreibzeitpunkt nicht.
--
-- ── Der gewählte Anker: die E-Mail ──────────────────────────────────────────
-- auth.users.email ist eine Kernspalte und steht im selben INSERT-Statement,
-- ist im Trigger also garantiert sichtbar — unabhängig von jedem
-- Metadata-Timing. Der Vertrag hängt deshalb an der normalisierten E-Mail und
-- nicht an Metadaten.
--
-- raw_user_meta_data wird bewusst NICHT als Sicherheitsquelle verwendet: die
-- ist bei einem normalen /signup vom Client frei befüllbar.
--
-- ── Sicherheitsrichtung ─────────────────────────────────────────────────────
-- Der Pending Invite erteilt NIEMALS Zugriff. Seine einzige Wirkung im Trigger
-- ist das Unterdrücken des generischen Fallbacks, also "kein Grant". Der
-- tatsächliche Grant entsteht ausschliesslich im kanonischen Vertrag
-- create_invited_customer_with_contact (20260917160000).
--
--   NO GRANT    ist im Fehlerfall erlaubt.
--   WRONG GRANT ist nie erlaubt.
--
-- ── Bindung an den konkreten Nutzer ─────────────────────────────────────────
-- Der Trigger kennt nur die E-Mail. Damit ein Provider nicht über einen
-- offenen Invite einen FREMDEN Selbst-Signup derselben Adresse einsammeln
-- kann, wird der Invite nach createUser über bind_pending_client_invite_v1()
-- an genau die erzeugte user_id gebunden. Der kanonische Vertrag akzeptiert
-- nur gebundene Invites. Ein Selbst-Signup wird nie gebunden und ist damit
-- nicht einsammelbar (er bekommt in diesem Fenster lediglich keinen
-- Fallback-Provider — "kein Grant", nicht "falscher Grant").
--
-- Keine Session-Variable, keine globale Triggerabschaltung, kein Hook: der
-- Zustand liegt in einer Zeile mit Ablaufdatum und wird transaktional
-- verbraucht.

-- ── Normalisierung ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._hm_normalize_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(lower(btrim(coalesce(p_email, ''))), '');
$$;

REVOKE ALL ON FUNCTION public._hm_normalize_email(text) FROM PUBLIC, anon, authenticated;

-- ── Der Vertrag ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hm_pending_client_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  normalized_email text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  bound_at timestamptz,
  consumed_at timestamptz,
  consumed_user_id uuid,
  invalidated_at timestamptz,
  invalidated_reason text,
  cleanup_required boolean NOT NULL DEFAULT false,
  CONSTRAINT hm_pending_client_invites_email_normalized
    CHECK (normalized_email = lower(btrim(normalized_email)) AND normalized_email <> ''),
  CONSTRAINT hm_pending_client_invites_ttl
    CHECK (expires_at > created_at),
  CONSTRAINT hm_pending_client_invites_consumed_needs_user
    CHECK (consumed_at IS NULL OR consumed_user_id IS NOT NULL)
);

COMMENT ON TABLE public.hm_pending_client_invites IS
  'Serverseitiger Pending-Invite-Vertrag. Einziger Zweck: auto_assign_client_to_provider() daran hindern, einem eingeladenen Kunden den generischen "erster Provider"-Fallback zu geben. Erteilt selbst NIE Zugriff. Nur über service_role / SECURITY DEFINER beschreibbar, nie aus dem Browser.';

-- Höchstens EIN offener Invite je Adresse: macht die Zuordnung im kanonischen
-- Vertrag eindeutig und serialisiert konkurrierende Einladungen derselben
-- Adresse an der Datenbank statt im Anwendungscode.
CREATE UNIQUE INDEX IF NOT EXISTS hm_pending_client_invites_active_email_uniq
  ON public.hm_pending_client_invites (normalized_email)
  WHERE consumed_at IS NULL AND invalidated_at IS NULL;

-- Retry-Schlüssel: derselbe request_id desselben Providers erzeugt nie einen
-- zweiten Invite.
CREATE UNIQUE INDEX IF NOT EXISTS hm_pending_client_invites_provider_request_uniq
  ON public.hm_pending_client_invites (provider_id, request_id);

CREATE INDEX IF NOT EXISTS hm_pending_client_invites_expires_idx
  ON public.hm_pending_client_invites (expires_at)
  WHERE consumed_at IS NULL AND invalidated_at IS NULL;

CREATE INDEX IF NOT EXISTS hm_pending_client_invites_user_idx
  ON public.hm_pending_client_invites (user_id);

-- Kein Client kommt an diese Tabelle. RLS an, bewusst OHNE Policy: damit ist
-- sie für anon/authenticated vollständig dicht; service_role und der
-- Tabelleneigentümer (SECURITY DEFINER) umgehen RLS ohnehin.
ALTER TABLE public.hm_pending_client_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hm_pending_client_invites FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.hm_pending_client_invites FROM PUBLIC, anon, authenticated;

-- ── Aufräumen abgelaufener Invites ──────────────────────────────────────────
-- Ein abgelaufener Invite darf weder den Unique-Index blockieren noch einen
-- normalen Signup dauerhaft unterdrücken. Beides wird hier erledigt; die
-- Unterdrückung im Trigger prüft zusätzlich expires_at direkt.
CREATE OR REPLACE FUNCTION public._hm_expire_pending_client_invites(p_email text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.hm_pending_client_invites
  SET invalidated_at = now(),
      invalidated_reason = coalesce(invalidated_reason, 'expired')
  WHERE consumed_at IS NULL
    AND invalidated_at IS NULL
    AND expires_at <= now()
    AND (p_email IS NULL OR normalized_email = public._hm_normalize_email(p_email));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public._hm_expire_pending_client_invites(text) FROM PUBLIC, anon, authenticated;

-- ── Nachschlagefunktion für den Trigger ─────────────────────────────────────
-- Liefert true, wenn für diese Adresse ein gültiger, offener Invite existiert.
-- Bewusst nur ein boolean: der Trigger soll daraus keinen Provider ableiten
-- können, nur "nicht automatisch zuordnen".
CREATE OR REPLACE FUNCTION public._hm_has_active_pending_client_invite(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hm_pending_client_invites pi
    WHERE pi.normalized_email = public._hm_normalize_email(p_email)
      AND pi.consumed_at IS NULL
      AND pi.invalidated_at IS NULL
      AND pi.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public._hm_has_active_pending_client_invite(text) FROM PUBLIC, anon, authenticated;

-- ── Schritt 1: Invite anlegen (VOR auth.admin.createUser) ───────────────────
CREATE OR REPLACE FUNCTION public.create_pending_client_invite_v1(
  p_provider_id uuid,
  p_email text,
  p_request_id text,
  p_ttl_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_ttl integer;
  v_row public.hm_pending_client_invites;
BEGIN
  IF p_provider_id IS NULL THEN
    RAISE EXCEPTION 'Provider is required';
  END IF;

  IF nullif(btrim(coalesce(p_request_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Request id is required';
  END IF;

  IF NOT public.has_role(p_provider_id, 'provider'::app_role) THEN
    RAISE EXCEPTION 'Only providers may invite customers';
  END IF;

  v_email := public._hm_normalize_email(p_email);
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Customer email is required';
  END IF;

  v_ttl := greatest(1, least(coalesce(p_ttl_minutes, 15), 60));

  -- Abgelaufene Invites dieser Adresse zuerst schliessen, sonst blockiert der
  -- Unique-Index eine neue, legitime Einladung.
  PERFORM public._hm_expire_pending_client_invites(v_email);

  -- Retry mit demselben request_id: keinen zweiten Invite erzeugen.
  SELECT * INTO v_row
  FROM public.hm_pending_client_invites
  WHERE provider_id = p_provider_id
    AND request_id = p_request_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_row.normalized_email <> v_email THEN
      RAISE EXCEPTION 'Request id already used for a different email';
    END IF;

    IF v_row.consumed_at IS NOT NULL THEN
      RETURN jsonb_build_object(
        'invite_id', v_row.id, 'request_id', v_row.request_id,
        'status', 'already_completed', 'expires_at', v_row.expires_at,
        'user_id', v_row.consumed_user_id
      );
    END IF;

    IF v_row.invalidated_at IS NULL AND v_row.expires_at > now() THEN
      RETURN jsonb_build_object(
        'invite_id', v_row.id, 'request_id', v_row.request_id,
        'status', 'pending', 'expires_at', v_row.expires_at,
        'user_id', v_row.user_id
      );
    END IF;

    -- Abgelaufen oder invalidiert: derselbe Retry darf ihn wiederbeleben,
    -- solange die Adresse frei ist. Das hält den request_id-Vertrag stabil.
    UPDATE public.hm_pending_client_invites
    SET invalidated_at = NULL,
        invalidated_reason = NULL,
        cleanup_required = false,
        user_id = NULL,
        bound_at = NULL,
        created_at = now(),
        expires_at = now() + make_interval(mins => v_ttl)
    WHERE id = v_row.id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
      'invite_id', v_row.id, 'request_id', v_row.request_id,
      'status', 'pending', 'expires_at', v_row.expires_at, 'user_id', NULL
    );
  END IF;

  -- Fremder offener Invite auf dieselbe Adresse: nicht übernehmen.
  IF EXISTS (
    SELECT 1 FROM public.hm_pending_client_invites
    WHERE normalized_email = v_email
      AND consumed_at IS NULL
      AND invalidated_at IS NULL
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Another invite for this email is already pending';
  END IF;

  INSERT INTO public.hm_pending_client_invites (
    request_id, provider_id, normalized_email, expires_at
  )
  VALUES (
    p_request_id, p_provider_id, v_email, now() + make_interval(mins => v_ttl)
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'invite_id', v_row.id, 'request_id', v_row.request_id,
    'status', 'pending', 'expires_at', v_row.expires_at, 'user_id', NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_pending_client_invite_v1(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_client_invite_v1(uuid, text, text, integer) TO service_role;

-- ── Schritt 2: Invite an die erzeugte Identität binden (NACH createUser) ────
CREATE OR REPLACE FUNCTION public.bind_pending_client_invite_v1(
  p_invite_id uuid,
  p_provider_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hm_pending_client_invites;
  v_user_email text;
BEGIN
  IF p_invite_id IS NULL OR p_provider_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'Invite, provider and user are required';
  END IF;

  SELECT * INTO v_row
  FROM public.hm_pending_client_invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending invite not found';
  END IF;

  IF v_row.provider_id <> p_provider_id THEN
    RAISE EXCEPTION 'Pending invite belongs to another provider';
  END IF;

  IF v_row.consumed_at IS NOT NULL THEN
    IF v_row.consumed_user_id = p_user_id THEN
      RETURN jsonb_build_object('invite_id', v_row.id, 'status', 'already_completed');
    END IF;
    RAISE EXCEPTION 'Pending invite already consumed by another user';
  END IF;

  IF v_row.invalidated_at IS NOT NULL THEN
    RAISE EXCEPTION 'Pending invite is no longer valid';
  END IF;

  IF v_row.expires_at <= now() THEN
    RAISE EXCEPTION 'Pending invite has expired';
  END IF;

  SELECT public._hm_normalize_email(u.email) INTO v_user_email
  FROM auth.users u WHERE u.id = p_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Invited user does not exist';
  END IF;

  IF v_user_email <> v_row.normalized_email THEN
    RAISE EXCEPTION 'Invited user does not match the pending invite';
  END IF;

  IF v_row.user_id IS NOT NULL AND v_row.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Pending invite is already bound to another user';
  END IF;

  UPDATE public.hm_pending_client_invites
  SET user_id = p_user_id,
      bound_at = coalesce(bound_at, now())
  WHERE id = v_row.id;

  RETURN jsonb_build_object('invite_id', v_row.id, 'status', 'bound');
END;
$$;

REVOKE ALL ON FUNCTION public.bind_pending_client_invite_v1(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bind_pending_client_invite_v1(uuid, uuid, uuid) TO service_role;

-- ── Kompensation ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invalidate_pending_client_invite_v1(
  p_invite_id uuid,
  p_provider_id uuid,
  p_reason text DEFAULT NULL,
  p_cleanup_required boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hm_pending_client_invites;
BEGIN
  IF p_invite_id IS NULL OR p_provider_id IS NULL THEN
    RAISE EXCEPTION 'Invite and provider are required';
  END IF;

  SELECT * INTO v_row
  FROM public.hm_pending_client_invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('invite_id', p_invite_id, 'status', 'not_found');
  END IF;

  IF v_row.provider_id <> p_provider_id THEN
    RAISE EXCEPTION 'Pending invite belongs to another provider';
  END IF;

  -- Ein bereits verbrauchter Invite wird nicht mehr zurückgedreht; das würde
  -- einen erfolgreich hergestellten Kunden nachträglich in Frage stellen.
  IF v_row.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('invite_id', v_row.id, 'status', 'already_completed');
  END IF;

  UPDATE public.hm_pending_client_invites
  SET invalidated_at = coalesce(invalidated_at, now()),
      invalidated_reason = coalesce(nullif(btrim(coalesce(p_reason, '')), ''), invalidated_reason, 'invalidated'),
      cleanup_required = cleanup_required OR coalesce(p_cleanup_required, false)
  WHERE id = v_row.id;

  RETURN jsonb_build_object('invite_id', v_row.id, 'status', 'invalidated');
END;
$$;

REVOKE ALL ON FUNCTION public.invalidate_pending_client_invite_v1(uuid, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invalidate_pending_client_invite_v1(uuid, uuid, text, boolean) TO service_role;
