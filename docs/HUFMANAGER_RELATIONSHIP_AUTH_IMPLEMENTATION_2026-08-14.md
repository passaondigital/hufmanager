# HufManager – Relationship/Auth Implementation Note

**Stand:** 2026-08-14  
**Scope:** HufManager implementation reference  
**Canonical source:** `HUFI – Kanonische Architektur & Modellfamilie` plus `HUFI – Identitäten, Pferdebeziehungen & Berechtigungsmodell – 2026-08-14` in the HUFI architecture Drive/VPS knowledge layer.

> This file is a HufManager implementation note, not a second independent HUFI architecture source-of-truth.

## Canonical identity model

- `#KID` = horse owner / client
- `#EQID` = durable horse identity
- `#PID` = horse professional / provider
- `#PRID` = partner / additional horse professional

Workspaces do not replace these IDs. A workspace is an active context of the same authenticated person.

## Core authorization rule

The horse / `#EQID` is the central relationship object.

Authorization should resolve server-side as:

```text
Identity
→ Context/Workspace
→ Horse/#EQID
→ Relationship
→ Relationship status
→ Grant/Permission
→ Data scope
→ Action
```

Frontend routes, visible buttons, URL parameters, readable IDs, `user_metadata`, product branding, local storage or role alone are not sufficient authorization.

Unknown or contradictory state must fail closed (`DENY` / `LIMITED`).

## Current HufManager data mapping

### Horse owner chain

`horses`

- internal UUID: `id`
- readable horse IDs: `eqid`, `readable_id`
- owner: `owner_id`

### Provider relationship

`access_grants` currently represents primarily `#PID ↔ #KID` and includes status/permissions such as:

- `client_id`
- `provider_id`
- `can_view_basic`
- `can_view_medical`
- `can_create_appointments`
- `is_active`
- `status`
- `valid_until`

Important limitation: the current provider grant is not necessarily horse-scoped, therefore an active `#PID ↔ #KID` grant alone does not prove a relationship to one specific `#EQID`.

### Partner relationship

`horse_partner_access` is already horse-scoped and represents the more granular `#EQID ↔ #PRID` model.

## Relationship state semantics

Operational cross-user actions require an active relationship.

- `pending` / waiting → no operational cross-user action
- `active` → potentially allowed, subject to explicit permission
- `inactive` / `revoked` / `deactivated` → deny
- unknown status → deny

## Appointment notifications

Two-way appointment status functionality is being implemented:

- professional → client: `Ich komme`, `Verspätung melden`
- client → professional: `Ich verspäte mich`

Frontend request must not supply arbitrary recipient IDs. Preferred request payload:

```text
appointment_id
delay_minutes
optional short note
```

Server-side authorization must validate before notification/push:

```text
Authenticated sender
→ appointment exists
→ appointment.horse_id exists
→ horse exists
→ horse.owner_id == appointment.client_id
→ sender and recipient are real appointment parties
→ valid ACTIVE relationship
→ recipient derived server-side
→ notification/push
```

For `#PID`, until provider grants become horse-scoped, use the verified horse-owner/appointment chain plus a valid active, unexpired `access_grants` relationship as a transitional rule.

For `#PRID`, require valid `horse_partner_access` for the same `appointment.horse_id/#EQID` where the current schema supports it.

## Security findings to keep separate from feature work

Client security audit on 2026-08-14 found:

- P0 = 0
- P1 = 3
- P2 = 4
- P3 = 2

P1 areas:

1. overly broad/implicit medical access in some connection flows
2. HM Connect invitation acceptance/RLS mismatch
3. broad/public storage access for sensitive horse/hoof media

Additional push finding:

- legacy `send-push-notification` accepted a target `user_id` from authenticated caller input while using service-role internally; appointment-specific notification flow must derive the recipient server-side and arbitrary push targeting must be blocked.

## Privacy rule

A relationship never implies full horse-record access. Medical/health, documents, hoof/diagnostic media, location/GPS, write/upload rights and appointment creation remain explicit/granular permissions.

## Long-term target

Unify HufManager and HufiApp around a horse-scoped relationship/permission layer without destructively reclassifying existing users, UUIDs, readable IDs or horse records.
