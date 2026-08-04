# Hufi Swipe Workspace

## Heutiger Prototyp

`HufiSwipeWorkspacePreview` ist ein isolierter, standardmäßig ausgeschalteter mobiler Workspace. Er wird ausschließlich über `VITE_HUFI_SWIPE_WORKSPACE=true` sichtbar. Die spätere Integration liegt beim Lead in `MobileShell`; diese Spur verändert weder Shell, Router noch globale Styles.

Der Workspace öffnet sich über einen bewussten Rechtswisch vom linken Rand (maximal 24 px Startzone, mindestens 72 px horizontal, maximal 36 px vertikal) oder über die sichtbare, tastaturbedienbare Schaltfläche. Der Pointer-Handler ruft nie `preventDefault` auf; vorhandenes horizontales Scrollen bleibt deshalb unangetastet.

## Routen und Kacheln

Aktive Kacheln verwenden ausschließlich in `App.tsx` vorhandene Routen: Termine (`/kalender`), Kunden (`/kunden`), Pferde (`/pferde`), Rechnungen (`/rechnungen`), Beobachtung (`/hufi-observation-lab`) und Dokumente (`/mein-office`). Kamera und Synchronisierung bleiben sichtbar, aber bewusst deaktiviert, weil keine passende produktive Route vorliegt.

Das Hamburger-Menü erhält keine Workspace-Aufgaben. Seine geplante Verantwortung bleibt: Profil, Einstellungen, Voice-Guthaben, Abo, Hilfe, Rechtliches und Abmelden.

## Lead-Integration

Der Lead importiert `HufiSwipeWorkspacePreview` nur in eine gemeinsam verantwortete Fläche und rendert sie dort. Erst dann den Preview-Flag in der jeweiligen Preview-Umgebung setzen. Vor einer breiteren Aktivierung: Android-Touch-Test mit horizontal scrollbaren Bestandteilen und Fokus-Test mit Tastatur.
