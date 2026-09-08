# HufiDataCore — CopeCart IPN

Stand: 2026-09-08

## Zweck

CopeCart ist der erste externe Event-Produzent für den HufiDataCore. Der
DataCore ist bewusst vom produktiven HufManager-Freischaltungs-Webhook
getrennt. Er sammelt normalisierte Ereignisse für HufiBoss, GroqBot und
spätere HufiAgents, ohne dass jeder Agent eine eigene CopeCart-Anbindung
braucht.

```text
CopeCart
   │ IPN / HMAC
   ▼
hufi-data-core
   ├── hufi_data_events   (append-only Historie)
   └── hufi_data_state    (letzter bekannter Zustand je Entität)
                │
                ├── HufiBoss
                ├── GroqBot
                └── HufiAgents
```

## CopeCart Generic Integration

**Benachrichtigungs-URL**

```text
https://vnschgjxkzzwzefqlrji.supabase.co/functions/v1/hufi-data-core
```

**Kennwort**

Muss exakt dem Supabase Runtime Secret `COPECART_IPN_PASSWORD` entsprechen.
Das Secret gehört niemals in Git, Browser-Code, Agent-Prompts oder Logs.

**Integrationstyp**

`Integration zur Vertragserfüllung`

Nach dem Anlegen muss die Integration den gewünschten CopeCart-Produkten
zugeordnet werden. Zuerst mit einer Testbestellung verifizieren.

## Sicherheit

- `verify_jwt = false` ist absichtlich gesetzt, da CopeCart keinen Supabase-JWT
  sendet.
- Authentifizierung erfolgt per `X-Copecart-Signature`.
- Die Signatur ist HMAC-SHA256 über den **rohen Request-Body** mit
  `COPECART_IPN_PASSWORD` als Shared Secret.
- Ungültige Signaturen werden mit HTTP 401 abgewiesen.
- Bei erfolgreicher Verarbeitung antwortet der Endpoint exakt mit `OK`.
- `hufi_data_events` und `hufi_data_state` haben keine Client-Policies und
  sind nur über den Backend-Service-Role zugänglich.
- Im Event-Payload wird nur eine begrenzte Whitelist von CopeCart-Feldern
  gespeichert. Secrets/Passwörter/Tokens werden nicht übernommen.

## Datenmodell

### `hufi_data_events`

Append-only Ereignisprotokoll. Wichtigste Felder:

- `source = 'copecart'`
- `source_event_id` — Idempotenzschlüssel
- `event_type`
- `event_category`
- `entity_type`, `entity_id`
- `product_id`, `order_id`, `transaction_id`, `subscription_id`
- `customer_email`, `customer_name`
- `amount`, `currency`, `status`, `is_test`
- `occurred_at`, `received_at`
- `payload_sha256`
- `payload` — sanitierter Ausschnitt

CopeCart-Retries werden über `(source, source_event_id)` dedupliziert.

### `hufi_data_state`

Materialisierte letzte Sicht pro Entität. Agenten müssen dadurch für Fragen
wie „Welche Abos sind aktuell gekündigt?“ nicht jedes historische Event neu
auswerten.

Die RPC-Funktion `hufi_data_apply_state` verhindert, dass ein verspäteter
älterer Retry einen neueren Zustand überschreibt.

## Agenten-Anbindung

Agenten erhalten **nicht** den Supabase Service-Role-Key im Client. Ein
serverseitiger Agent-/MCP-Layer darf lesen:

- `hufi_data_state` für aktuellen Kontext,
- `hufi_data_events` für Historie und Änderungen seit dem letzten Cursor.

Spätere Quellen (GitHub, Gmail, HufManager, Server, Analytics usw.) können in
dieselben Tabellen schreiben, sofern `source`, `source_event_id`,
`event_type` und die Normalisierung eingehalten werden.

## Verifikation nach CopeCart-Test-IPN

```sql
select
  source,
  event_type,
  product_id,
  order_id,
  transaction_id,
  status,
  is_test,
  received_at
from public.hufi_data_events
where source = 'copecart'
order by received_at desc
limit 10;
```

```sql
select
  source,
  entity_type,
  entity_id,
  last_event_type,
  status,
  product_id,
  last_received_at
from public.hufi_data_state
where source = 'copecart'
order by last_received_at desc
limit 10;
```

## Abgrenzung zum bestehenden `copecart-webhook`

`hufi-data-core` ist nur die zentrale Event-/Agenten-Datenschicht. Der
bestehende `copecart-webhook` enthält die produktive Geschäftslogik für
Zugänge, Rechnungen und andere Produktaktionen. Diese Verantwortlichkeiten
werden vorerst bewusst nicht vermischt.
