# HufManager – Relationship/Auth Implementation Note

**Stand:** 2026-08-14  
**Scope:** HufManager implementation reference  
**Canonical source:** `HUFI – Kanonische Architektur & Modellfamilie` plus `HUFI – Identitäten, Pferdebeziehungen & Berechtigungsmodell – 2026-08-14` in the HUFI architecture Drive/VPS knowledge layer.

> This file is a HufManager implementation note, not a second independent HUFI architecture source-of-truth.

## Product rule: horse first

The horse is the first fachliche/product layer across HufManager and the wider HUFI ecosystem.

Technical IDs exist for identity, security and deterministic linking, but the UI and user journey should primarily communicate the concrete horse, its record, the people around it, relationship state and allowed actions.

Every relevant flow should be reviewable as:

```text
Horse
→ people/business involved
→ relationship
→ relationship status
→ permission
→ business process
→ user-facing explanation
```

This rule applies across client, provider and partner surfaces, including:

- horse record
- connect/search/invites
- appointments/tours
- offers and service requests
- service orders/treatments
- invoices/payments
- documents/media/findings
- chat/notifications
- permissions/privacy
- history/audit
- Hufi/AI retrieval and actions

Do not optimize only the `#ID` layer and forget the business relationship around the horse.

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

## UX / explanation rule

At the point where a user connects, shares, books, accepts, rejects, revokes, pays or communicates, the UI should explain the horse-specific consequence in simple language.

Examples:

- `Du gibst Lisa Zugriff auf Hopes Behandlungsdaten.`
- `Max darf Termine für Hope sehen und verwalten.`
- `Diese Rechnung gehört zur Behandlung von Hope.`
- `Die Verbindung zu diesem Pferdeprofi ist noch nicht bestätigt.`
- `Der Zugriff wurde deaktiviert; neue Daten werden nicht mehr geteilt.`

Public/marketing pages should express the same principle without architecture terminology: one horse record, all relevant people around the horse, owner-controlled sharing.

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

## Cross-cutting deep-dive scope

Relationship/security reviews must follow the business chain and not stop at access tables.

For every relevant client/provider/partner flow, inspect how the same horse relationship propagates through:

```text
Horse
→ relationship
→ offer/request
→ order/treatment
→ appointment/tour
→ documentation
→ invoice/payment
→ chat/notification
→ history/audit
```

Verify that horse identity, ownership, relationship state and permissions remain consistent across each transition.

## Current implementation focus

1. Keep the HufManager client area as the primary active UX/security cleanup target.
2. Do not artificially reduce useful client capability; organize and explain it horse-first.
3. In parallel, perform a smaller targeted consistency review of provider and partner areas for the same relationship/status/permission rules.
4. No big-bang redesign or destructive identity migration.
5. Every UI fix must remain consistent with server-side authorization and existing horse/business flows.

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
