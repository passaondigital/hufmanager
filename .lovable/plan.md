
# Fokus-Effekt fuer HM-CAM: Vignette und Hintergrund-Blur

## Was wird gebaut?
Ein optionaler "Fokus-Modus" fuer die HM-CAM, der nach dem Fotografieren einen professionellen Vignette-Effekt auf das Bild anwendet. Die Bildraender werden abgedunkelt und leicht unscharf, wodurch das zentrale Motiv (der Huf) visuell hervorgehoben wird.

## Warum kein echter Portrait-Modus?
Echte Hintergrund-Segmentierung (wie beim iPhone) erfordert Machine-Learning-Modelle, die auf bestimmte Motive trainiert sind. Fuer Pferdehufe existiert kein solches Modell, und ein generisches wuerde unzuverlaessige Ergebnisse liefern -- das widerspricht der "Stability First"-Philosophie der HM-CAM.

## Loesung: Canvas-basierter Radial-Fokus-Effekt

### Effekt-Beschreibung
- Kreisfoermiger Fokusbereich in der Bildmitte (ca. 60% des Bildes) bleibt unberuehrt
- Uebergangszone: sanfter Gradient von klar zu Effekt
- Randbereich: leichte Abdunklung (Vignette) + optionaler Weichzeichner (Gaussian Blur)
- Ergebnis: Professioneller Look, Blick wird auf den Huf gelenkt

### Technische Umsetzung

**1. Neuer Hook: `usePhotoFocusEffect.ts`**
- Nimmt ein Canvas/Image und wendet den Effekt an
- Nutzt `CanvasRenderingContext2D` mit `radialGradient` fuer die Vignette
- Optionaler StackBlur-Algorithmus (rein clientseitig, keine externe Lib) fuer den Weichzeichner am Rand
- Konfigurierbare Intensitaet (leicht/mittel/stark)

**2. Aenderung in `HMCamCapture.tsx`**
- Neuer State: `focusEffectEnabled` (Toggle-Button im Vorschau-Modus)
- Nach dem Capture und VOR dem Bestaetigen: Effekt wird auf das Canvas angewendet
- Der Nutzer sieht die Vorschau mit Effekt und kann ihn ein-/ausschalten
- Beim Speichern wird das Bild MIT Effekt hochgeladen (wenn aktiviert)

**3. UI-Erweiterung: Fokus-Toggle**
- Kleiner Button in der Vorschau-Ansicht (nach Foto-Aufnahme)
- Icon: Kreissymbol (Target/Focus)
- Drei Stufen: Aus / Leicht / Stark
- Default: "Leicht" (dezenter Profi-Look)

### Ablauf

```text
Foto aufnehmen
      |
      v
Vorschau anzeigen
      |
      v
[Fokus: Aus] [Fokus: Leicht] [Fokus: Stark]
      |
      v
Nutzer waehlt Stufe (Live-Vorschau)
      |
      v
"Speichern" -> Effekt wird eingebrannt -> Upload
```

### Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/hooks/usePhotoFocusEffect.ts` | Neu: Canvas-basierter Vignette/Blur-Effekt |
| `src/components/hufcam/FocusEffectControls.tsx` | Neu: Toggle-UI (Aus/Leicht/Stark) |
| `src/components/hufcam/HMCamCapture.tsx` | Erweitert: Effekt in Vorschau und Speicher-Logik integrieren |

### Wichtig
- Kein externes ML-Modell, keine zusaetzliche Bibliothek
- Rein Canvas-basiert = funktioniert offline, schnell, zuverlaessig
- Effekt wird nur auf das gespeicherte Bild angewendet, nicht auf den Live-Stream (Stabilitaet)
- Respektiert die "Stability First"-Philosophie: Der Effekt ist optional und greift nie in den Aufnahmeprozess ein
