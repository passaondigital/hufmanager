

## Analyse: Client-App vs. andere Instanzen

### Ist-Zustand

| Feature | Provider | Employee | Partner | **Client** |
|---|---|---|---|---|
| Desktop-Sidebar | `AppSidebar` | `AppSidebar` | `AppSidebar` | **Keine** |
| Mobile-Sidebar (Sheet) | ✅ | ✅ | ✅ | **Keine** |
| Desktop-Header mit Suche/Theme | `AppHeader` | `AppHeader` | `AppHeader` | **Kein Header** |
| Bottom-Nav (mobil) | ✅ | ✅ mit Plus-FAB | ✅ | ✅ (`ClientBottomNav`) |
| Logout-Button sichtbar | Sidebar + Management | Sidebar + Profil | Sidebar | **Nur tief in `/client-profile` versteckt** |
| 5A-Navigation (gruppiert) | ✅ | ✅ | ✅ | **Flat, 5 Tabs** |

**Kernprobleme:**
1. Client hat **kein Layout-System** — `ClientLayout` ist nur ein `<div>` + `<Outlet>`
2. **Kein Logout** in der Navigation — nur am Ende der Profilseite als destructive Button
3. **Keine Sidebar** auf Desktop — Client sieht eine mobile-only App auch auf 1920px
4. Navigation ist **flat** statt gruppiert wie bei den anderen 3 Instanzen

### Plan: Client-App auf Instanz-Level bringen

#### Schritt 1 — Client NavigationConfig definieren
Neue Datei mit der 5A-Struktur, angepasst auf Client-Funktionen:

```text
directItems:
  - Dashboard → /client-home

groups:
  "Meine Pferde"
    - Pferde → /client-horses
    - Pferdeakte (dynamisch pro Pferd)
    - Stallboard → /client-stall

  "Termine & Aufträge"
    - Buchen → /client-booking
    - Aufträge → /client-orders
    - Rechnungen → /client-invoices

  "Kommunikation"
    - Chat → /client-chat
    - Benachrichtigungen → /client-notifications
    - HM Connect → /client-connect

  "Verwaltung"
    - Berechtigungen → /client-permissions
    - Standorte → /client-locations
    - Notfall → /client-notfall

  "Konto"
    - Profil → /client-profile
    - Botschafter → /client/botschafter
    - Hilfe & Support (HelpCenter)
```

#### Schritt 2 — ClientAppLayout erstellen
Neuer Layout-Wrapper analog zu `EmployeeAppLayout`:
- **Desktop (lg+):** `AppSidebar` links (w-64) + `AppHeader` oben + Content
- **Mobil:** Hamburger-Header + Bottom-Nav + Sheet-Sidebar
- **Logout** im Sidebar-Footer (über `AppSidebar`, das `useLogout` bereits integriert hat)
- Theme-Toggle, Suche, Notification-Bell im Header

#### Schritt 3 — ClientBottomNav erweitern
- 5 Tabs behalten, aber Logout-Indikator nicht nötig (ist jetzt im Sidebar/Header)
- Optional: Plus-FAB in der Mitte wie Employee (Quick Actions: Termin buchen, Pferd hinzufügen, Chat)

#### Schritt 4 — ClientLayout in App.tsx austauschen
- `ClientLayout()` (Zeile 826-846) durch `<ClientAppLayout />` ersetzen
- Alle `/client-*` Routen bleiben gleich, nur das Layout-Wrapper ändert sich

#### Schritt 5 — ClientProfile bereinigen
- Logout-Card am Ende entfernen (ist jetzt im Sidebar)
- Header mit ArrowLeft entfernen (Sidebar-Navigation übernimmt)

### Technische Details

- Wiederverwendung von `AppSidebar` + `MobileAppSidebar` + `AppHeader` — gleiche Shared-Components wie Employee/Partner
- `useLogout` Hook ist bereits vorhanden und wird vom `AppSidebar` Footer-Button aufgerufen
- DemoBanner, AIChatWidget, HelpCenterFAB werden in das neue Layout integriert
- Responsive Breakpoint: `lg:` (1024px) für Sidebar-Sichtbarkeit, konsistent mit allen anderen Instanzen

### Ergebnis
Der Client bekommt exakt dieselbe Layout-Architektur wie Provider/Employee/Partner: Desktop-Sidebar mit gruppierten Menüs, mobiler Hamburger + Bottom-Nav, und einen **jederzeit sichtbaren Logout-Button**.

