# Hufi Swipe Workspace

## Heutiger Prototyp

`HufiSwipeWorkspacePreview` ist ein isolierter, standardmäßig ausgeschalteter mobiler Workspace. Er wird ausschließlich über `VITE_HUFI_SWIPE_WORKSPACE=true` sichtbar. Die spätere Integration liegt beim Lead in `MobileShell`; diese Spur verändert weder Shell, Router noch globale Styles.

Der Workspace öffnet sich über einen bewussten Rechtswisch vom linken Rand (maximal 24 px Startzone, mindestens 72 px horizontal, maximal 36 px vertikal) oder über die sichtbare, tastaturbedienbare Schaltfläche. Der Pointer-Handler ruft nie `preventDefault` auf; vorhandenes horizontales Scrollen bleibt deshalb unangetastet.

Die 24-px-Startzone ist ein reales, explizit breites Element mit voller Bildschirmhöhe (`pointer-events: auto`), nicht die umschließende Fixed-Section selbst. Eine Fixed-Section ohne explizite Breite, deren einzige Kinder `position: absolute` sind, kollabiert per CSS-Shrink-to-Fit auf ~0 px Breite -- die Geste wäre dadurch auf echten Geräten faktisch nie auslösbar gewesen, obwohl der sichtbare Button weiterhin funktioniert hätte. Behoben, indem die Gesten-Handler an ein eigenes `<div>` mit `width: WORKSPACE_EDGE_PX` (24 px) gebunden sind; die umschließende Section bleibt `pointer-events-none` und blockiert außerhalb der Randzone weiterhin nichts. Die Kern-Gestenlogik (`createSwipeGestureTracker`) ist als framework-freie State-Machine ausgelagert und direkt ohne DOM/React-Rendering testbar.

## Routen und Kacheln

Aktive Kacheln verwenden ausschließlich in `App.tsx` vorhandene Routen: Termine (`/kalender`), Kunden (`/kunden`), Pferde (`/pferde`), Rechnungen (`/rechnungen`), Beobachtung (`/hufi-observation-lab`) und Dokumente (`/mein-office`). Kamera und Synchronisierung bleiben sichtbar, aber bewusst deaktiviert, weil keine passende produktive Route vorliegt.

Das Hamburger-Menü erhält keine Workspace-Aufgaben. Seine geplante Verantwortung bleibt: Profil, Einstellungen, Voice-Guthaben, Abo, Hilfe, Rechtliches und Abmelden.

## Lead-Integration

Stand 2026-08-05: in Preview eingehängt. `HufiSwipeWorkspacePreview` wird als Geschwisterelement neben `HufiAssistantExperience` in `MobileShell.tsx` gerendert (Fragment, kein Eingriff in `HufiAssistantExperience.tsx` selbst). `VITE_HUFI_SWIPE_WORKSPACE=true` ist in der lokalen, gitignorten `.env` dieses Repos gesetzt. Produktion (`hufiapp.de`) baut aus einem komplett separaten Repo (`/root/hufmanager_v25/production`) und ist davon strukturell unberührt, nicht nur per Flag.

Kollisionsprüfung gegen den echten `HufiAssistantExperience`-Header (Wordmark links, Status+Hamburger-Menü rechts, Texteingabe zentriert im `<main>`):
- **Behoben:** Der "Workspace öffnen"-Button saß bei `top-3` im selben vertikalen Bereich (y≈12–56px) wie der Header (y≈10–54px) und überdeckte das "Hufi"-Wordmark. Auf `top-16` verschoben, damit er unterhalb des Headers sitzt. Die Randzone selbst (volle Höhe) ist unverändert.
- **Kein Konflikt:** Das Hamburger-Menü sitzt rechts, alle Workspace-Elemente links -- keine Überlappungsmöglichkeit unabhängig von der Bildschirmbreite.
- **Restrisiko, bewusst nicht blind gefixt:** Auf schmalen Viewports (~360px) endet die 24-px-Randzone exakt an der linken Kante der zentrierten Texteingabe (beide nutzen zufällig 24px), ohne Puffer. Keine echte Überlappung, aber auch kein Sicherheitsabstand -- vor einer breiteren Aktivierung mit einem echten schmalen Gerät verifizieren.

Noch offen: echter Android-/Desktop-Browsertest der Preview durch Pascal (kein Zugriff auf Basic-Auth + eingeloggte Session in dieser Session verfügbar). Vor einer breiteren Aktivierung zusätzlich: Fokus-Test mit Tastatur.
