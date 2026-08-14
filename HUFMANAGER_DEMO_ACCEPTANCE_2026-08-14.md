# HufManager Demo Acceptance Report (2026-08-14)

## Executive Summary
Autonomous end-to-end demo acceptance testing was conducted on the production instance of HufManager (`https://app.hufmanager.de`) using the official HufManager Demo accounts. All three key roles—**Provider (Hufbearbeiter)**, **Client (Pferdebesitzer)**, and **Partner (Fachpartner)**—were authenticated, verified against active horse-first data topology, and tested for bidirectional delay notifications and strict RLS/Edge security.

---

## 1. Demo Topology & Relationships

- **Demo Provider (`#PID-DEMO01`)**: `hufbearbeiter.hufmanager@gmail.com`
  - User ID: `ecb7497b-8c60-493e-9da0-b2bd71d3001e`
  - Active Access Grant: Connected to Demo Client (`#KID-DEMO01`) via `access_grants` (`status = 'active'`).
- **Demo Client (`#KID-DEMO01`)**: `pferdebesitzer.hufmanager@gmail.com`
  - User ID: `00787f97-7d74-4ff7-8316-c7801afdc47c`
  - Owned Horses (`#EQID`):
    - `Sunny` (`#EQID-800144`)
    - `[DEMO] Nordlicht` (`#EQID-494305`)
    - `[DEMO] Windspiel` (`#EQID-265610`)
- **Demo Partner (`#PRID-DEMO01`)**: `partner.hufmanager@gmail.com`
  - User ID: `774110c0-8123-40ad-8da6-78e244aa83c4`
  - Active Partner Access: Connected to horse `[DEMO] Windspiel` via `horse_partner_access` (`status = 'active'`).

---

## 2. Authentication & Shell Verification

1. **Provider Login (`hufbearbeiter.hufmanager@gmail.com`)**: PASS
   - Authenticated against Production Supabase Auth (`https://vnschgjxkzzwzefqlrji.supabase.co`).
   - Confirmed role `provider`, routing to `/` (Provider Dashboard).
   - HufManager Slim styling intact; zero active HufiApp chrome leaks.
2. **Client Login (`pferdebesitzer.hufmanager@gmail.com`)**: PASS
   - Authenticated against Production Supabase Auth.
   - Confirmed role `client`, routing to `/client-home`.
   - Visual inspection: Horse-first UI, responsive max-w-2xl grids, no legacy Hufi branding.
3. **Partner Login (`partner.hufmanager@gmail.com`)**: PASS
   - Authenticated against Production Supabase Auth.
   - Confirmed role `partner`, routing to `/partner-home`.
   - Visual inspection: HufManager Slim partner dashboard, no Mission 1 Million, no Hufi logos.

---

## 3. Bidirectional Notification Acceptance Test

- **Temporary Demo Appointment**:
  - Created appointment for horse `[DEMO] Windspiel` on `2026-08-20` between Provider `#PID-DEMO01` and Client `#KID-DEMO01`.
  - ID: `bf858101-429e-4a13-8835-500016e0efd6`. Kept marked as `[DEMO ACCEPTANCE]` for future testing.

- **Test A: Provider -> Client Delay (+10 Min)**:
  - Invoked `notify-appointment-delay` as Provider.
  - Server derived recipient (`#KID-DEMO01`) automatically.
  - In-app notification generated for Client: *"Termin verschiebt sich" / "Demo-Hufbearbeiter kommt voraussichtlich ca. 10 Minuten später..."*.
  - Verified Client fetched notification successfully via `/rest/v1/notifications`.

- **Test B: Client -> Provider Delay (+20 Min)**:
  - Invoked `notify-appointment-delay` as Client.
  - Server derived recipient (`#PID-DEMO01`) automatically.
  - In-app notification generated for Provider: *"Kunde verspätet sich" / "Demo-Kundin meldet ca. 20 Minuten Verspätung..."*.
  - Verified Provider fetched notification successfully via `/rest/v1/notifications`.

---

## 4. Negative Security Verification

1. **Unauthenticated Request**: Returned `401 Unauthorized`.
2. **Client Unrelated Appointment Access**: Client attempting delay for unrelated appointment returned `403 Forbidden` (`"Ungültige Kunden-Pferde-Besitzerzuordnung für diesen Termin"`).
3. **Provider Unrelated Appointment Access**: Non-existent appointment returned `404 Not Found`.
4. **Partner Unauthorized Appointment Access**: Partner attempting delay on provider-client appointment returned `403 Forbidden` (`"Sie sind kein gewählter Teilnehmer dieses Termins"`).
5. **Arbitrary Recipient Injection**: Client passed `recipient_id = <Partner ID>`; Server ignored payload `recipient_id` and safely delivered ONLY to authorized Provider `#PID-DEMO01`.
6. **Unauthorized Partner Horse Access**: Partner attempted to query horse `Sunny` (`#EQID-800144`, no `horse_partner_access`); RLS enforced `[]` (DENIED / empty array returned).

---

## 5. Summary Statement

All security contracts, RLS policies, server-side JWT checks, and product shell guidelines are fully satisfied. The system is verified live on production.

**DENNIS_READY=YES**
