# HufManager – Systemanalyse (Stand: 05.03.2026)

## 1. Tour Manager

### Kartenkomponente
- **Leaflet** (react-leaflet) mit **OpenStreetMap.de** Tiles
- URL: `https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png`
- Zwei Map-Instanzen:
  - `TourManager.tsx` — Vollbild-Karte auf `/tour`
  - `TourMapView.tsx` — eingebettet im WorkMode Tour-Tab

### GPS-Tracking
- `navigator.geolocation.watchPosition()` in `TourControls.tsx`
- Speichert Breadcrumbs in `tour_breadcrumbs`-Tabelle (lat, lng, accuracy)
- Minimum 100m Distanz zwischen Punkten (Haversine-Formel)
- Nur aktiv wenn Tour gestartet (`isTourActive`)

### Routing
- **OSRM** (`router.project-osrm.org`) für Distanz/Dauer-Berechnung
- 800ms Debounce
- Kein Turn-by-Turn-Routing, nur Entfernungsberechnung
- Navigation erfolgt über externe Apps (Google Maps / Apple Maps Link)

### Live-Daten
- Breadcrumbs (GPS-Koordinaten)
- Tour-Status (`tour_active_since`, `tour_ended_at`)
- `total_distance_km`
- `optimized_order` (JSONB)

### Offline-Fähigkeit
- ❌ Karten-Tiles werden **NICHT** offline gecacht
- Kein Service-Worker für Tiles
- Die Offline-Architektur (idb-keyval) cached nur Supabase-Query-Daten und Fotos

---

## 2. Zeit-Tracking

### Implementierung
- `WorkTimer.tsx` — **Start/Stop-Stoppuhr** mit Supabase-Persistierung
- Schreibt in DB-Tabelle auf Tagesebene

### Termin-Verknüpfung
- Indirekt — Timer läuft auf Tagesebene, nicht pro Appointment
- Mitarbeiter haben separate `/employee/timer` Page mit Check-in/Check-out pro Termin (automatische Zeiterfassung)

### Schwachstelle
- Keine direkte Kopplung zwischen Provider-WorkTimer und einzelnen Appointments

---

## 3. KM-Tracker

### Datenmodell
- Tabelle: `vehicle_mileage_logs`
  - `odometer_start`, `odometer_end`
  - `vehicle_id`, `appointment_id`
  - `route_description` (JSONB mit Multi-Stopp-Daten inkl. `startTime`, `endTime`, `arrivalTime`)

### Tour-Verknüpfung
- **Getrennt** — MileageTracker ist ein separater Tab im WorkMode
- Läuft parallel zum Tour Manager
- `TourCompletionSummary.tsx` zeigt nach Tour-Ende eine Zusammenfassung mit Live-Spritkosten

### Schwachstelle
- Keine automatische km-Übernahme aus dem Tour-GPS-Tracking
- Odometer wird manuell eingegeben

---

## 4. Spritpreise

### Einbindungsorte
| Komponente | Ort | Funktion |
|---|---|---|
| `FuelPriceWidget.tsx` | Dashboard | Live-Preise + Tageskosten-Banner |
| `FuelCostBanner.tsx` | Dashboard | "Diesel heute X €/L – Fahrtkosten ~Y€" |
| `TravelCostEditor.tsx` | Rechnungserstellung | Live-Preis vs. Pauschale Vergleich |
| `TourCompletionSummary.tsx` | MileageTracker | Tour-Abschluss Zusammenfassung |
| `MonthlyFuelInsight.tsx` | Dashboard | Monats-Vergleich (Flat vs. Live) |
| `Fuhrpark.tsx` | Fahrzeugverwaltung | Tankkosten-Erfassung |

### API
- Supabase Edge Function `fuel-prices` (Tankerkönig API)
- GPS-basiert mit Radius-Suche

### Verbindung zu km/Tour
- Ja — über `consumption` aus `provider_vehicles` + km aus `daily_tours` / `vehicle_mileage_logs`

---

## 5. Rollen & Zugriffe

### Existierende Rollen

| Rolle | Beschreibung |
|---|---|
| `provider` | Hufbearbeiter (Hauptnutzer), voller Zugriff |
| `client` | Pferdebesitzer, eingeschränkt |
| `partner` | Fachpartner (Tierarzt, Sattler etc.) |
| `admin` | Plattform-Administrator |
| `employee` | Sub-Rollen: `view`, `employee`, `team_lead` |

### Zugriffs-Steuerung
- **Route-Level:** `ProtectedRoute` mit `allowedRoles` Array, Redirect bei falscher Rolle
- **Component-Level:** `EmployeeRoleGate` blockiert UI-Bereiche für Assistenten
- **DB-Level:** `has_role()` SECURITY DEFINER Funktion, `user_roles`-Tabelle (separat von `profiles`)

### Sichtbarkeit Tour/Zeit/km

| Bereich | Zugriff |
|---|---|
| `/tour` | `provider`, `admin` (via ProtectedRoute) |
| WorkMode (alle Tabs) | Nur Provider-Layout |
| `/employee/tour` | Employees (eigene Seite) |
| `/employee/timer` | Employees (eigene Seite) |

### RLS-Policies
- Client-seitig filtern `daily_tours`, `tour_breadcrumbs`, `vehicle_mileage_logs` nach `provider_id = user.id`
- Server-seitige RLS-Policies in Supabase-Migrations definiert (nicht aus Frontend-Code ersichtlich)

---

## 6. Map-Probleme & Limitierungen

| Problem | Detail | Schweregrad |
|---|---|---|
| Kein Offline-Tile-Cache | Karte zeigt graue Fläche ohne Internet | 🔴 Hoch |
| OSRM Demo-Server | Öffentlich, rate-limited, kann jederzeit ausfallen | 🔴 Hoch |
| Duplizierte Map-Logik | `TourManager.tsx` und `TourMapView.tsx` haben eigene MapContainer | 🟡 Mittel |
| Kein Turn-by-Turn | Nur externe Navigation via Google/Apple Maps | 🟡 Mittel |
| Leaflet Icon Bug | Manueller Fix (`delete _getIconUrl`) in mehreren Dateien separat | 🟢 Niedrig |
| Geocoding-Fallback | Ohne lat/lng fällt auf PLZ-Schätzung zurück — ungenau | 🟡 Mittel |
| Keine Tile-Layer-Auswahl | Fest auf OpenStreetMap.de, kein Satellit/Gelände | 🟢 Niedrig |
| Kein Marker-Clustering | Performance-Problem bei vielen Markern möglich | 🟡 Mittel |

---

## Dateien-Übersicht

### Tour Manager
```
src/components/tour-manager/
├── BreadcrumbsReplay.tsx
├── FahrtenbuchExport.tsx
├── NearbyCustomersLayer.tsx
├── OnMyWayButton.tsx
├── StableGroupPanel.tsx
├── TourCard.tsx
├── TourControls.tsx
├── TourManager.tsx
├── TourPdfExport.tsx
├── TourStatsPanel.tsx
└── index.ts
```

### WorkMode
```
src/components/workmode/
├── MileageTracker.tsx
├── TourCompletionSummary.tsx
├── VehicleManagement.tsx
├── WorkTimer.tsx
└── index.ts
```

### Spritpreise
```
src/components/dashboard/
├── FuelPriceWidget.tsx
├── FuelCostBanner.tsx
└── MonthlyFuelInsight.tsx

src/hooks/useFuelPrices.ts
```

### Offline-Infrastruktur
```
src/lib/offline/
├── index.ts
├── offlineConfig.ts
├── imageQueue.ts
├── imageSyncManager.ts
├── syncManager.ts
└── syncQueue.ts
```
