# 📊 PREISGRUPPEN - KOMPLETER LEITFADEN

## 🎯 Worum geht es?

Du hast **verschiedene Kundentypen** mit **verschiedenen Preisen**:
- **Standard**: Normal zahlende Kunden (100% Preis)
- **VIP**: Großstallbetriebe, viele Pferde → **Rabatt** (~15-20%)
- **Großstall**: 50+ Pferde → **Extra-Rabatt** (~25-30%)
- **Individuell**: Spezielle Verträge, Staffelungen

Früher hast du das im Kopf gemacht. Jetzt ist es **automatisch und dokumentiert**.

---

## 💾 WIE ES IN DER DATENBANK FUNKTIONIERT

### 1. **Kunden-Zuordnung**
```
profiles (Tabelle: Kunden/Pferdebesitzer)
├── id: UUID des Kunden
├── name: "Schmidt Familie"
└── price_group: "vip"  ← HIER ist die Zuordnung!
```

**Wo zuordnen?** 
- Beim Erstellen eines Kunden
- Im Kunden-Detail → "Preisgruppe: VIP"

---

### 2. **Preise definieren**
```
service_price_overrides (tabelle: Preisüberschreibungen)
├── service_id: z.B. "Barhufbearbeitung"
├── price_group: "vip"
├── price: 38€ (statt 45€)
└── provider_id: Deine ID

Beispiel:
- Barhufbearbeitung Standard: 45€
- Barhufbearbeitung VIP: 38€ (15.5% Rabatt)
- Hufkorrektur Standard: 55€
- Hufkorrektur VIP: 47€
```

**Wo definieren?**
- Neue Seite: `/preise` im Sidebar
- Tabelle mit allen Leistungen × Preisgruppen

---

### 3. **Automatische Anwendung beim Termin**
```
Wenn Termin erstellt:
1. Kunden-ID abrufen
2. Kunden-Preisgruppe abfragen (z.B. "vip")
3. Funktion aufrufen: calculate_effective_price()
4. Diese gibt zurück: 38€ (nicht 45€!)
5. Rechnung wird mit 38€ erstellt
6. Transparent im Kalender angezeigt
```

---

## ✅ SCHRITT-FÜR-SCHRITT SETUP

### **Phase 1: Preisgruppen erstellen** (10 Min)
```
1. Gehe zu: Angebote → Preisgruppen
2. Klick: "+ Neue Gruppe"
3. Name: "VIP"
   Beschreibung: "Großstallbetriebe mit Rabatt"
4. Repeat für: "Großstall", "Individuell", etc.
```

### **Phase 2: Preise pro Gruppe definieren** (20 Min)
```
Für jede Leistung (Barhufbearbeitung, Hufkorrektur, etc.):

| Leistung | Standard | VIP (-15%) | Großstall (-25%) |
|----------|----------|----------|----------|
| Barhufbearbeitung | 45€ | 38€ | 34€ |
| Hufkorrektur | 55€ | 47€ | 41€ |
| Erstberatung | 0€ | 0€ | 0€ |

→ Einfach in die Felder klicken und Preise eingeben
```

### **Phase 3: Kunden den Gruppen zuordnen** (variabel)
```
1. Gehe zu: Kunden-Detail (Klick auf einen Kunden)
2. Tab: "Allgemein"
3. Feld: "Preisgruppe" 
4. Dropdown: "VIP" wählen
5. Speichern

→ AB SOFORT: Alle neuen Termine für diesen Kunden = VIP-Preis!
```

---

## 🔍 FEHLERQUELLEN & PRÄVENTION

### ❌ **Fehler 1: Kunde hat keine Preisgruppe zugewiesen**
```
Folge: Termin kostet 100% (Standard)
Fix: 
  1. Kunden öffnen
  2. Im Detail nach oben scrollen
  3. "Preisgruppe" = "VIP" eintragen
  4. Speichern
```

### ❌ **Fehler 2: Preis in Gruppe vergessen**
```
Folge: Berechnung nutzt dann Standard-Preis
Fix:
  1. Zu Preisgruppen gehen
  2. Alle orange/leeren Felder ausfüllen
  3. Für JEDE Leistung × JEDE Gruppe einen Preis
```

### ❌ **Fehler 3: Alte Termine mit falschem Preis**
```
Folge: Kunde "Müller" war früher Standard, jetzt VIP
       Alte Rechnungen haben 45€, neue sollten 38€ sein
Fix:
  1. Alt-Rechnungen: In Vergangenheit → nicht ändern!
  2. Neue Termine: Automatisch mit neuem Preis
  3. Rest: Manual korrigieren (Kulanz oder Gutschrift)
```

### ✅ **Fehler 4: Test-Termin vor Deploy**
```
Vor dem Deploy:
1. Erstelle TEST-Kunden "Test VIP"
2. Ordne zu: Preisgruppe "VIP"
3. Erstelle Termin
4. Verifiziere: Rechnung zeigt VIP-Preis
5. DELETE Test-Kunden und Termin
6. → ERST DANN deployen auf production
```

---

## 🎬 LIVE-BEISPIEL

**Dein Betrieb:**
- Barhufbearbeitung: 45€ Standard

**Kundengruppe "VIP-Stall":**
- 30 Pferde, 2x jährlich
- Sondervertrag: 15% Rabatt = 38,25€

**So richtest du es ein:**
```
1. Neue Gruppe: "UhlandHof VIP" (Beschreibung: "30er Stall, 2x/Jahr")
2. Preise: Barhufbearbeitung = 38,25€
3. Kunden "Uhland" → Preisgruppe = "UhlandHof VIP"
4. Nächster Termin kostet automatisch: 38,25€
5. Rechnung zeigt: "Barhufbearbeitung (VIP-Preis): 38,25€"
```

---

## 🛠 DATENBANK-CHECK (Für Nerds)

Wenn du sehen willst, was eingetragen ist:

```sql
-- Alle Preisgruppen des Providers
SELECT * FROM price_groups WHERE provider_id = 'YOUR_ID';

-- Aktuelle Preisüberschreibungen
SELECT * FROM service_price_overrides 
WHERE provider_id = 'YOUR_ID';

-- Kunden mit Zuordnung
SELECT id, full_name, price_group FROM profiles 
WHERE role = 'client' AND created_by_provider_id = 'YOUR_ID';

-- Berechne effektiven Preis
SELECT public.calculate_effective_price(
  service_id := 'ABC123',
  client_id := 'CLIENT_ID',
  provider_id := 'YOUR_ID'
); -- gibt z.B. 38.25 zurück
```

---

## 🚨 CHECKLISTE VOR DEPLOYMENT

- [ ] Migration `20260226_emergency_first_aid_system.sql` gerunned
- [ ] Mindestens 3 Preisgruppen erstellt (Standard, VIP, Großstall)
- [ ] Für JEDE Leistung × JEDE Gruppe = Preis eingetragen
- [ ] 5 Test-Kunden mit verschiedenen Gruppen erstellt
- [ ] Test-Termine angelegt → Rechnung zeigt richtige Preise
- [ ] Alte Kunden in richtige Gruppen eingeteilt
- [ ] Team informiert: "Neue Preislogik ab heute"
- [ ] Backup von alter Preisliste gemacht (Falls Rollback)

---

## 📞 HÄUFIG GEFRAGT

**F: Can ich Preisgruppen später ändern?**
A: Ja! Neue Preise gelten sofort für neue Termine. Alte Termine/Rechnungen bleiben unverändert.

**F: Was wenn ich Kundengruppe von VIP → Standard änd?**
A: Nächste Termine kosten wieder Normal-Preis. Alte Rechnungen bleiben wie sie sind.

**F: Kann ich Preisgruppe pro Termin editieren?**
A: Ja! Im Termin-Detail kannst du "Preis manuell überschreiben". Dann wird deine Eingabe benutzt.

**F: Was ist der Unterschied zwischen Preisgruppe und Preis-Override?**
A: 
- Preisgruppe = Kundentyp (z.B. "VIP")
- Preis-Override = Was VIP konkret kostet pro Leistung

**F: Ist es DSGVO-konform?**
A: Ja! Alle Preisänderungen werden im `emergency_audit_log` protokolliert (wer, wann, was geändert).

---

**🎉 Du bist ready!** Die erste Aufgabe nach Deploy: Melde dich an und erstelle deine Preisgruppen.
