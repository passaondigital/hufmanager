

## Kampagnen-Tab + Admin-Analytics + Komplettes E-Mail-Marketing-Modul

### Kontext

Das E-Mail-Marketing-Modul existiert noch nicht im Code (kein `src/features/` Ordner, keine DB-Tabellen). Dieser Plan baut **alle vier Grundpfeiler** in einem Schritt:

1. **Datenbank-Schema** (alle E-Mail-Marketing-Tabellen)
2. **Kampagnen-Tab** mit Editor, Listenansicht und Einzel-Analytics
3. **Leads-Tab** (Formular-Builder + Landingpage-Sync)
4. **Autoresponder-Tab** (Timeline-Builder)
5. **Kontakte-Tab** (Abonnenten-Tabelle)
6. **Mission Control Admin-Analytics** (globales Dashboard + System-Broadcast)
7. **Navigation + Routing**

---

### 1. Datenbank-Migration

Sechs neue Tabellen, alle mit RLS (`owner_id = auth.uid()`):

| Tabelle | Zweck |
|---|---|
| `email_lists` | Kontaktlisten (name, owner_id, subscriber_count) |
| `email_subscribers` | Abonnenten (list_id, email, name, status, source, tags) |
| `email_campaigns` | Kampagnen (subject, content_html, status, list_id, stats: sent/opened/clicked/bounced/unsubscribed) |
| `email_automations` | Autoresponder-Ketten (name, trigger_type, list_id, is_active) |
| `email_automation_steps` | Einzelschritte (automation_id, delay_days, subject, content_html, sort_order) |
| `email_signup_forms` | Lead-Formulare (slug, fields_config, list_id) |

Öffentlicher INSERT auf `email_subscribers` für Signup-Formulare. Admin-Leserechte auf alle Tabellen für Mission Control.

---

### 2. Neue Dateien

Alle unter `src/features/email-marketing/`:

```text
src/features/email-marketing/
├── EmailMarketingPage.tsx        ← Hauptseite mit 4 Tabs
├── tabs/
│   ├── CampaignsTab.tsx          ← Tabelle + "Neue Kampagne" Button
│   ├── LeadsTab.tsx              ← Formular-Builder + Sync-Toggle
│   ├── AutoresponderTab.tsx      ← Timeline-Builder Wrapper
│   └── ContactsTab.tsx           ← Abonnenten-Tabelle
├── campaigns/
│   ├── CampaignEditor.tsx        ← E-Mail-Editor (Subject, HTML, Vorschau)
│   ├── CampaignDetailModal.tsx   ← Detail-Analytics (4 KPI-Cards + Donut-Chart)
│   └── CampaignRow.tsx           ← Tabellenzeile mit Mini-Badges
├── autoresponder/
│   ├── AutoresponderBuilder.tsx  ← Vertikale Timeline
│   ├── TriggerCard.tsx           ← Sequenz-Name + Trigger-Dropdown
│   ├── EmailStepCard.tsx         ← E-Mail-Box auf der Timeline
│   ├── DelayBlock.tsx            ← Verzögerungs-Badge
│   ├── EmailEditorModal.tsx      ← Modal für E-Mail-Inhalt
│   └── types.ts                  ← Interfaces
├── lead-gen/
│   ├── LandingpageSyncCard.tsx   ← Toggle + Listen-Dropdown
│   ├── FormBuilderCard.tsx       ← Feld-Checkboxen + Erstellen-Button
│   └── FormPreviewCard.tsx       ← Vorschau + Share-Link + Embed-Code
├── contacts/
│   └── SubscribersTable.tsx      ← Sortierbare Tabelle mit Filter
├── public/
│   └── SignupFormPage.tsx        ← /newsletter/:slug (öffentlich)
├── admin/
│   └── AdminEmailAnalytics.tsx   ← Mission Control Tab
└── hooks/
    ├── useEmailLists.ts
    ├── useEmailCampaigns.ts
    ├── useEmailSubscribers.ts
    └── useSignupForms.ts
```

---

### 3. Kampagnen-Tab (Nutzer-Ansicht)

- **Kopfbereich**: `bg-[#F47B20]` Button "Neue Kampagne erstellen" + Suchfeld
- **Tabelle**: Name, Status-Badge (Entwurf/Geplant/Gesendet), Datum, Performance (zwei Mini-Badges: Öffnungsrate + Klickrate)
- **Detail-Modal** bei Klick auf gesendete Kampagne:
  - 4 KPI-Cards: Gesendet, Geöffnet, Geklickt, Abgemeldet (große schwarze Zahlen)
  - Donut-Chart in `#F47B20` für Öffnungsrate (Recharts)
- **Kampagnen-Editor**: Betreff, Absendername, Textarea für HTML-Inhalt, Live-Vorschau, Ziel-Liste wählen

---

### 4. Mission Control Admin-Analytics

Neuer Tab "E-Mail Marketing" in der bestehenden `MissionControl.tsx` TabsList:

- **3 Top-KPI-Cards**: Aktive E-Mail-Nutzer, Versendete E-Mails (Gesamt/Monat), Durchschnittliche Öffnungsrate
- **System-Broadcasts-Tabelle**: Kürzlich gesendete Broadcasts mit Reichweite
- **System-Broadcast-Formular**: Betreff + Inhalt + Zielgruppen-Auswahl (Provider/Partner/Stallbetreiber) + Senden-Button

---

### 5. Routing-Ergänzungen (App.tsx)

- `/email-marketing` → `EmailMarketingPage` (Provider/Partner/Stallbetreiber)
- `/newsletter/:slug` → `SignupFormPage` (öffentlich)
- Mission Control: Neuer Tab in bestehender Route `/admin/mission-control`

---

### 6. Navigation

- **AppSidebar.tsx**: Neuer Eintrag "E-Mail Marketing" (Mail-Icon) im Erweiterungen-Bereich
- **MissionControl.tsx**: Neuer TabsTrigger "E-Mail" in der TabsList

---

### 7. Design (durchgängig)

- Hintergrund: `bg-[#F5F5F5]`
- Karten: `bg-white rounded-xl shadow-sm`
- Text: `text-black`
- CTA-Buttons: `bg-[#F47B20] hover:bg-[#e06a10] text-white`
- Charts/Progress: `#F47B20`

---

### Umsetzungsreihenfolge

1. DB-Migration (6 Tabellen + RLS)
2. Hooks (CRUD für alle Tabellen)
3. EmailMarketingPage mit 4 Tabs
4. Kampagnen-Tab + Editor + Detail-Analytics
5. Leads-Tab (Sync + Formular-Builder)
6. Autoresponder-Tab (Timeline-Builder)
7. Kontakte-Tab
8. Admin-Analytics in Mission Control
9. Öffentliche Signup-Route
10. Navigation + Routing

