# Hufi Swipe Workspace

## Heutiger Prototyp

`HufiSwipeWorkspacePreview` ist ein isolierter, standardmäßig ausgeschalteter mobiler Workspace. Er wird ausschließlich über `VITE_HUFI_SWIPE_WORKSPACE=true` sichtbar. Die spätere Integration liegt beim Lead in `MobileShell`; diese Spur verändert weder Shell, Router noch globale Styles.

Der Workspace öffnet sich über einen bewussten Rechtswisch vom linken Rand (maximal 24 px Startzone, mindestens 72 px horizontal, maximal 36 px vertikal) oder über die sichtbare, tastaturbedienbare Schaltfläche. Der Pointer-Handler ruft nie `preventDefault` auf; vorhandenes horizontales Scrollen bleibt deshalb unangetastet.

Die 24-px-Startzone ist ein reales, explizit breites Element mit voller Bildschirmhöhe (`pointer-events: auto`), nicht die umschließende Fixed-Section selbst. Eine Fixed-Section ohne explizite Breite, deren einzige Kinder `position: absolute` sind, kollabiert per CSS-Shrink-to-Fit auf ~0 px Breite -- die Geste wäre dadurch auf echten Geräten faktisch nie auslösbar gewesen, obwohl der sichtbare Button weiterhin funktioniert hätte. Behoben, indem die Gesten-Handler an ein eigenes `<div>` mit `width: WORKSPACE_EDGE_PX` (24 px) gebunden sind; die umschließende Section bleibt `pointer-events-none` und blockiert außerhalb der Randzone weiterhin nichts. Die Kern-Gestenlogik (`createSwipeGestureTracker`) ist als framework-freie State-Machine ausgelagert und direkt ohne DOM/React-Rendering testbar.

## Routen und Kacheln

Aktive Kacheln verwenden ausschließlich in `App.tsx` vorhandene Routen: Termine (`/kalender`), Kunden (`/kunden`), Pferde (`/pferde`), Rechnungen (`/rechnungen`), Beobachtung (`/hufi-observation-lab`) und Dokumente (`/mein-office`). Kamera und Synchronisierung bleiben sichtbar, aber bewusst deaktiviert, weil keine passende produktive Route vorliegt.

Das Hamburger-Menü erhält keine Workspace-Aufgaben. Seine geplante Verantwortung bleibt: Profil, Einstellungen, Voice-Guthaben, Abo, Hilfe, Rechtliches und Abmelden.

## Lead-Integration

Der Lead importiert `HufiSwipeWorkspacePreview` nur in eine gemeinsam verantwortete Fläche und rendert sie dort. Erst dann den Preview-Flag in der jeweiligen Preview-Umgebung setzen. Vor einer breiteren Aktivierung: Android-Touch-Test mit horizontal scrollbaren Bestandteilen und Fokus-Test mit Tastatur.
