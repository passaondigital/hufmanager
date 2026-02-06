
# Plan: Lovable-Branding vollständig aus der Suchmaschinen-Darstellung entfernen

## Hintergrund
Google zeigt in den Suchergebnissen das Lovable-Favicon an, weil die aktuelle `favicon.ico`-Datei noch das Lovable-Standard-Icon enthält. Zusätzlich gibt es Meta-Tags, die auf die lovable.app-Domain verweisen.

## Notwendige Änderungen

### 1. Neue favicon.ico-Datei erstellen/bereitstellen
**Problem:** Die Datei `/public/favicon.ico` enthält das Lovable-Icon.
**Lösung:** Eine neue favicon.ico-Datei mit dem HufManager-Logo muss bereitgestellt werden.

**Wichtig:** Du musst mir ein eigenes HufManager-Favicon als Bilddatei hochladen oder eine URL zu einem passenden Icon geben. Ich kann dann die Datei ersetzen.

---

### 2. Open Graph URL anpassen (index.html)
**Datei:** `index.html`

**Änderung:**
```html
<!-- Vorher -->
<meta property="og:url" content="https://hufmanager.lovable.app" />

<!-- Nachher - mit Custom Domain wenn vorhanden -->
<meta property="og:url" content="https://hufmanager.de" />
```

Falls du keine eigene Domain hast, kann die Zeile auch entfernt werden - sie ist optional.

---

### 3. Twitter URL (optional, falls Custom Domain vorhanden)
Die Twitter-Tags sind bereits korrekt auf "HufManager" gesetzt.

---

## Was bereits funktioniert
- CSS versteckt den Lovable-Badge vollständig
- PWA-Icons sind alle mit HufManager-Branding
- Apple Touch Icon ist korrekt
- `lovable-tagger` läuft nur im Development-Mode

---

## Nach der Umsetzung
Google aktualisiert Favicons nicht sofort. Es kann **2-4 Wochen** dauern, bis Google das neue Favicon übernimmt. Du kannst den Prozess beschleunigen, indem du:
1. Die Google Search Console verwendest (URL prüfen → Indexierung beantragen)
2. Die Sitemap erneut einreichst

---

## Nächster Schritt
Bitte lade ein HufManager-Favicon hoch (idealerweise als .ico, .png oder .svg). Dann ersetze ich die aktuelle Datei und passe die Meta-Tags an.
