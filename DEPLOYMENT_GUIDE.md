# 🚀 DEPLOYMENT ANLEITUNG - NOTFALL + PREISGRUPPEN

## **SCHRITT 1: SUPABASE-MIGRATION DEPLOYEN**

### Option A: Mit Supabase CLI (Einfachest)
```bash
# Wenn nicht installiert:
npm install -g @supabase/cli

# Login mit deinen Supabase Credentials
supabase login

# Deploy die Migration
cd /workspaces/hufmanager
supabase db push

# Output sollte zeigen:
# ✔ Pushed migration: 20260226_emergency_first_aid_system.sql
```

### Option B: Manuell im Dashboard
1. Öffne https://supabase.com → Dein Projekt
2. Gehe zu **SQL Editor**
3. Klick **New Query**
4. Kopiere ALLES aus dieser Datei:
   ```
   supabase/migrations/20260226_emergency_first_aid_system.sql
   ```
5. Paste in SQL-Editor
6. Klick **Run** (oben rechts)
7. Warte auf ✅ Success

---

## **SCHRITT 2: VERIFIKATION**

Nach dem Deploy - mache diese Checks:

### Check A: Tables existieren
```sql
-- Öffne SQL Editor und führe aus:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('emergency_otp', 'emergency_escalations', 'price_groups', 'service_price_overrides');

-- Sollte 4 Rows zurückgeben
```

### Check B: Functions existieren
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_emergency_otp', 'get_provider_clients', 'calculate_effective_price');

-- Sollte 3 Rows zurückgeben
```

### Check C: RLS aktiv
```sql
SELECT tablename FROM pg_tables 
WHERE tablename IN ('emergency_otp', 'emergency_escalations') 
AND rowsecurity = true;

-- Sollte 2 rows mit rowsecurity=true zeigen
```

---

## **SCHRITT 3: FRONTEND DEPLOYEN**

Deine Änderungen sind bereits im Code:
- `/src/pages/EmergencyDashboard.tsx` ✅ Notfall-Dashboard
- `/src/pages/PriceGroupManagement.tsx` ✅ Preisgruppen-Verwaltung
- `/src/App.tsx` ✅ Routing integriert
- `/src/components/layout/AppSidebar.tsx` ✅ Navigation hinzugefügt

### Deployment (abhängig von deinem Setup):

**Wenn mit Vercel/Netlify:**
```bash
# Deine CI/CD sollte automatisch deployen wenn du pushst
git add .
git commit -m "feat: Add Emergency OTP + Price Group Management"
git push
# → Vercel/Netlify baut automatisch neu
```

**Wenn lokal testen:**
```bash
npm install  # oder bun install
npm run dev  # startet dev-server auf localhost:5173
```

---

## **SCHRITT 4: ADMIN SETUP**

Nach Deploy (im Browser eingeloggt als Admin):

1. Gehe zu `/admin/mission-control`
2. Neuer Tab: **Eskalationen** sollte sichtbar sein ✅
3. Noch keine Daten? Normal! Erste werden hinzugefügt wenn Provider Notfall nutzen

---

## **SCHRITT 5: PROVIDER TRAINING**

Nach Deploy - deine Provider sehen:
- **Neuer Menü-Item:** "Notfall" beim Punkt 2 (Angebote/Kunden)
- **Neue URL:** `/preise` für Preisgruppen-Verwaltung
- **Neue URL:** `/notfall` für Notfall-Dashboard

### Kurz-Text zum Weiterleiten:

```
🚑 NEUE FEATURE: NOTFALL-DASHBOARD

Hallo Team,

ab sofort steht euch ein Notfall-Dashboard zur Verfügung:

1. Gehe zu: Angebote → Notfall
2. Suche Kunden
3. Klick: "OTP anfordern" → bekommst 8-stelliges Code
4. Code an Patient/Besitzer geben → fertig!

Die Notfall wird auch automatisch protokolliert.

---

💰 NEUE FEATURE: PREISGRUPPEN

Ab sofort können Kundengruppen mit verschiedenen Preisen angelegt werden:

1. Gehe zu: Angebote → Preisgruppen
2. Erstelle Gruppen: "VIP", "Großstall", "Individuell"
3. Definiere Preise pro Leistung und Gruppe
4. Ordne Kunden den Gruppen zu

→ Bei Terminerstellung wird automatisch der richtige Preis benutzt!

Fragen? Siehe: PRICE_GROUPS_GUIDE.md
```

---

## **SCHRITT 6: FIRST-RUN CHECKLIST**

Nach alles deployt ist - machst du diese Tests:

- [ ] Login as Provider
- [ ] Gehe zu "Angebote" → "Notfall" → funktioniert? ✅
- [ ] Gehe zu "Angebote" → "Preisgruppen" → Seite lädt? ✅
- [ ] Erstelle 1 Preisgruppe "TEST" → speichert? ✅
- [ ] Gebe Preise ein → speichert? ✅
- [ ] Login as Admin
- [ ] Gehe zu `/admin/mission-control` → "Eskalationen" Tab sichtbar? ✅
- [ ] Gehe zu `Kunden` → Öffne einen Kunden → Field "Preisgruppe" sichtbar? ✅

---

## **FEHLERSUCHE**

### ❌ **"emergency_otp table doesn't exist"**
Lösung: Migration wurde nicht gerunned!
```
- Gehe zu Supabase SQL Editor
- Import die migration file
- Run it!
```

### ❌ **"Permission denied on create_emergency_otp"**
Lösung: RLS Policy fehlt
```
- Prüfe in Migration ob alle POLICIES gerunned wurden
- Falls nicht: Füge fehlende Policy manuell ein
```

### ❌ **Notfall-Page zeigt "keine Kunden"**
Lösung: Provider hat mit Kunden noch nicht verbunden
```
- Nutzer muss zu Kunde gehen und auf "Notfall-Link generieren" klicken
- ODER: Admin erstellt access_grant manuell in DB
```

### ❌ **Preisgruppen-Seite zeigt keine Services**
Lösung: Provider hat noch keine Leistungen definiert
```
- Provider muss zu Services gehen
- +Neue Leistung hinzufügen (z.B. Barhufbearbeitung)
- Dann zu Preisgruppen zurück
```

---

## **WICHTIGE SICHERHEITS-NOTIZEN**

✅ **RLS ist aktiv:**
- Provider sieht nur SEINE Kunden
- Admin sieht alles (alle Eskalationen)
- Audit-Log protokolliert JEDEN Zugriff

✅ **OTP ist gehashed:**
- Passwort wird mit bcrypt gehashed
- Selbst Admin kann Original-Code nicht sehen
- Nach 30 Min automatisch expired

✅ **Audit-Trail:**
- Alle Notfälle + Eskalationen = gelogt
- Wer, wann, was → DSGVO-konform

---

## **ON-GOING MAINTENANCE**

1. **Regelmäßige Checks:**
   - Alle abgelaufenen OTPs löschen (optional, auto cleanup nach 30min)
   - Ausstehende Eskalationen reviewen

2. **Updates:**
   - Preisgruppen sollten 2x/Jahr reviewt werden
   - Neue Services = neue Preisgruppen Zeilen

3. **Monitoring:**
   - Admin Tab "Eskalationen" → sollte alle Notfälle zeigen
   - Audit-Log → sollte Zugriffe zeigen

---

## 🎉 DU BIST FERTIG WENN:

1. ✅ Migration gerunned (Supabase bestätigt)
2. ✅ Frontend deployed
3. ✅ Admin sieht Eskalationen-Tab
4. ✅ Provider sieht Notfall + Preisgruppen Link
5. ✅ Test: Ein Notfall erstellen → funzt
6. ✅ Test: Preisgruppe erstellen → funzt
7. ✅ Test: Kunde Preisgruppe zuordnen → funzt

---

**Questions?** Siehe:
- `PRICE_GROUPS_GUIDE.md` für Preislogik
- `supabase/migrations/20260226_emergency_first_aid_system.sql` für DB-Schema
- `/src/pages/EmergencyDashboard.tsx` für UI-Code
