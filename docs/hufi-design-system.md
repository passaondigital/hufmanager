# Hufi Designsystem

Isolierte Grundlage ohne globale Overrides oder produktive Migration.

## Tokens

Warmer Canvas und Oberflächen, orangefarbener Akzent, semantische Statusfarben; Abstandsraster 4/8/12/16/24/32 px, Radien 12/18/26 px und 160-ms-Interaktionen. Die CSS-Module reagieren scoped auf Light/Dark und verändern keine vorhandenen App-Tokens.

## Primitives

`HufiSurface`, `HufiPanel`, `HufiButton`, `HufiIconButton`, `HufiStatusBadge`, `HufiTile`, `HufiSheet` liegen in `src/design-system/hufi/primitives.tsx`. Touch-Ziele sind mindestens 48 px; Fokus ist sichtbar.

## Preview und Integration

`HufiDesignSystemPreview` ist eine isolierte mobile Story-Komponente. Der Lead kann sie über eine bestehende Preview-only Route einbinden; sie importiert CSS selbst. `MobileShell`, Router, `package.json` und globale CSS bleiben unverändert. Spätere Integration: Kontrast, Screenreader-Kontext und reduzierte Bewegung im jeweiligen Screen prüfen.

## Erster echter Verwendungsort

`HufiSwipeWorkspacePreview` (`src/components/workspace/HufiSwipeWorkspace.tsx`) nutzt seit 2026-08-05 die Primitives (`HufiPanel`, `HufiButton`, `HufiIconButton`, `HufiTile`) statt roher Tailwind-Klassen für Drawer, Buttons und Kacheln -- reines Restyling, keine Funktionsänderung. Erster Einsatz außerhalb der isolierten Story-Komponente.
