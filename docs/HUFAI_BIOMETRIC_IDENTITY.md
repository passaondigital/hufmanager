# HufAI — Biometrische Identität & Passkeys

> Stand: 2026-05-11. Forschungs- und Architekturdokument.
>
> Ziel: Schnelle, sichere Identität für Pflegeprofis —
> kein Passwort beim Betreten des Stalls.

---

## Was heute implementiert ist

**Dateien:**
- `src/lib/hufi-biometrics.ts` — WebAuthn, vollständig implementiert
- `src/components/sensors/HufiBiometricGate.tsx` — UI-Gate
- Integration: `/management/sicherheit`

**Implementierung:**
- WebAuthn API (PublicKeyCredential)
- Algorithmen: ES256, RS256
- Platform Authenticator (Face ID / Touch ID / Windows Hello)
- Credential-Registrierung und -Verifizierung funktional

**Bekanntes kritisches Problem:**
Biometrischer Credential-ID liegt nur in `localStorage`. Das bedeutet:
- Gerätwechsel → Biometrie verloren
- Browser-Storage gecleart → Biometrie verloren
- Kein Cross-Device-Login per Biometrie
- Kein Server-seitiges Backup der Credential-ID

---

## Überblick: Biometrie-Technologien

### WebAuthn / Passkeys

**Standard:** W3C Web Authentication API (Level 2, 2021)

**Was es ist:**
- Protokoll für passwortlose Authentifizierung
- Nutzt Hardware-Kryptographie (SE, TPM)
- Privater Schlüssel verlässt das Gerät nie
- Öffentlicher Schlüssel beim Server gespeichert

**Unterstützte Authenticatoren:**
- **Platform Authenticator:** in Gerät eingebaut (Face ID, Touch ID,
  Windows Hello, Android Fingerprint)
- **Roaming Authenticator:** externe Hardware (YubiKey, etc.)

**Passkeys (2022+):**
Passkeys sind WebAuthn-Credentials die Cloud-Synced werden:
- Apple: iCloud Keychain → Passkey auf allen Apple-Geräten
- Google: Google Password Manager → Passkey auf Android + Chrome
- Microsoft: Windows Hello + Microsoft Account

**Für HufiApp bedeutet das:**
Wenn Passkeys statt device-bound Credentials genutzt werden,
löst sich das Cross-Device-Problem von selbst — Apple-Nutzer
haben ihren Passkey auf allen Apple-Geräten.

---

### Face ID (Apple)

**Plattform:** iOS 12+, iPadOS, macOS (2019+)
**Zugriff via:** WebAuthn Platform Authenticator auf iOS/macOS

**In HufiApp:**
- Beim WebAuthn-Credential-Erstellen wählt iOS automatisch Face ID
  wenn verfügbar
- User-Experience: Gerät vor Gesicht halten → Entsperrt
- Pascal am Pferd: kein Passwort, kein Pin, kurzer Blick ins Handy

---

### Touch ID (Apple + Android Fingerprint)

**Plattform:** iOS (ältere Geräte), MacBooks (T2+), Android
**Zugriff via:** WebAuthn Platform Authenticator

Äquivalente Erfahrung auf Android: Fingerabdrucksensor oder
Gesichtserkennung über Google's FIDO2-Implementierung.

---

### Windows Hello

**Plattform:** Windows 10/11
**Methoden:** PIN, Fingerabdruck, Gesichtserkennung (Infrarot)
**Zugriff via:** WebAuthn Platform Authenticator

Relevant für Pascal am Desktop (Büro, Buchhaltung).

---

## Empfohlene Architektur-Korrektur

### Heute (Fehler)

```
WebAuthn Registration
  → credentialId + publicKey
  → gespeichert nur in localStorage
  → keine Server-Persistenz
```

### Soll (korrekt)

```
WebAuthn Registration
  → credentialId + publicKey
  → gespeichert in Supabase: user_profiles.webauthn_credentials (JSONB Array)
  → localStorage nur als Cache für schnelle Lookup
  → Synced wenn online

user_profiles.webauthn_credentials:
[
  {
    credentialId: "base64...",
    publicKey: "base64...",
    algorithm: "ES256",
    deviceName: "iPhone 15 Pro",
    createdAt: "2026-05-11T...",
    lastUsed: "2026-05-11T...",
    platform: "ios"
  }
]
```

**Implementierungsaufwand:** Klein (< 1 Tag).

---

## Passkey-Migration

Passkeys sind die Zukunft. Bieten Cross-Device ohne eigene Sync-Infra.

**Empfehlung:**
1. Credential-ID in DB speichern (sofort, P0)
2. Passkey-Support prüfen (UA-Detection ob Passkey-fähig)
3. Bei Passkey-fähigen Geräten: Passkey anbieten (Cloud-Synced)
4. Bei älteren Geräten: klassisches WebAuthn device-bound

Apple Nutzer mit iCloud Keychain bekommen Passkeys automatisch
auf alle Apple-Geräte. Das ist der einfachste Cross-Device-Weg.

---

## Workflows für HufiApp

### Stall-Einstieg (ideal)

```
Pascal betritt Stallgebiet:
1. Handy aus der Tasche
2. HufiApp öffnet (Homescreen-Icon)
3. Face ID-Erkennung (automatisch bei App-Start)
4. Sofort im vollen Cockpit — kein Passwort, kein PIN
5. "Hey Hufi, starte den Tag"
```

### Tresor-Entsperrung (heute halb implementiert)

```
Pascal öffnet Pferde-Vault:
1. Biometrie-Gate erscheint
2. Touch ID / Face ID
3. Vault entsperrt
```

Heute: Biometrie-Gate vorhanden, aber Credential-Backup fehlt.
Wenn Gerät gewechselt → Vault-Zugriff verloren.

### Multi-Device (nach Fix)

```
Pascal:
  Handy: Face ID registriert + in DB gespeichert
  Tablet: Touch ID registriert + in DB gespeichert
  Mac: Face ID / Passwort + in DB gespeichert

Bei Gerätewechsel:
  Neues Gerät → einmalig WebAuthn registrieren
  Credential-ID in DB → sofort nutzbar
  Alte Credentials bleiben (bis manuell entfernt)
```

---

## DSGVO / Sicherheit

**Biometrie als Soft-Biometrie:**
HufiApp verarbeitet keine rohen biometrischen Daten.
Die biometrische Prüfung erfolgt vollständig auf dem Gerät.
Was in DB gespeichert wird: nur die Credential-ID (opaque bytes).

**DSGVO-Konformität:**
- Kein Speichern von Fingerabdruckdaten, Gesichtsdaten
- Credential-ID ist kryptographisch opaque — nicht rückführbar
- Löschen: `user_profiles.webauthn_credentials` Array truncaten
- Recht auf Vergessen: mitabgedeckt durch Account-Deletion-Flow

**Risiken:**
- Credential-ID in DB: geringe Sensitvität, kann nicht für Re-Auth
  ohne Hardware-Zugang genutzt werden
- Credential-Diebstahl allein reicht nicht für Auth — Gerät nötig

---

## Empfohlene nächste Schritte

| # | Aktion | Aufwand | Priorität |
|---|---|---|---|
| 1 | Credential-ID + publicKey in `user_profiles` speichern (JSONB Array) | Klein | P0 |
| 2 | localStorage als Fallback, DB als Source of Truth | Klein | P0 |
| 3 | Passkey-Detection im Registration-Flow | Klein | P1 |
| 4 | Geräte-Management-UI (Liste + Entfernen) | Mittel | P1 |
| 5 | Tresor-Entsperrung per Biometrie statt nur PIN | Klein | P2 |
| 6 | Biometrie beim App-Start als Fast-Auth | Mittel | P2 |
