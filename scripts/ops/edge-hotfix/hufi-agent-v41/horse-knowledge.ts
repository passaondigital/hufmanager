// Kompaktes Pferdewissen für Claude System-Prompt
// Muss Token-effizient sein — nur das Wichtigste

export const HORSE_KNOWLEDGE_PROMPT = `
PFERDE-FACHWISSEN (für präzise Antworten):

GESUNDHEIT-NOTFÄLLE (sofort Tierarzt):
- Kolik: Unruhe, Wälzen, Flankenschauen, kein Kot → SOFORT TA
- Hufrehe: Heiße Hufe, starker Puls, Taktfehler → SOFORT TA
- Tetanus: Muskelsteife, Kieferklemme → SOFORT TA
- EHV-1: Fieber + Ataxie → Quarantäne + SOFORT TA
- Hyperlipämie: Fressunlust + Lethargie bei Ponys → SOFORT TA

HÄUFIGE ERKRANKUNGEN:
- Strahlfäule: Fauliger schwarzer Strahl → täglich reinigen, trocken, Kupfersulfat
- EMS: Insulinresistenz, Fettpolster, Rehegefahr → zuckerarmes Heu, Bewegung, Blutbild
- PPID/Cushing: Langes Fell, Muskelschwund, alter Huf → Pergolid, Tierarzt
- Mauke: Krustenbildung Fesselbeuge → trockenlegen, Zinksalbe
- Sommerekzem: Scheuern Mähne/Schweif → Ekzemerdecke, Mücken meiden
- EGUS: Magengeschwür → Heu ad lib, Omeprazol, Tierarzt
- COB/RAO: Husten, Dämpfigkeit → Frischluft, staubarmes Futter

HUF-INTERVALLE (Hufbearbeiter):
- 4 Wochen: Intensivsport, aktive Pferde, Rehab
- 6 Wochen: Standard für die meisten Pferde
- 8 Wochen: Gut behornte Barhufpferde mit wenig Belastung

RASSEN-HINWEISE:
- Ponys (Shetty, Haflinger, Isländer): Hohe EMS/Rehe-Gefahr → Weidezugang kontrollieren
- Friesen: Neigung zu Magengeschwüren, Beinödemen
- Warmblut: Häufig OCD, Magengeschwüre bei Sport
- Ex-Rennpferde (OTTB, TB): Magerneigung, Magengeschwüre, brauchen Umschulung

HALTUNG:
- Offenstall/Paddock-Trail: Natürlichste Haltung, fördert Hufgesundheit
- Einzelboxe: Bewegungsmangel-Risiko → täglicher Auslauf essenziell
- Weide: Rehegefahr im Frühjahr (Fruktan-Gras)

FACHBEGRIFFE:
- Strahl = Frog | Kronlederhaut = Coronary band | Hufbein = Coffin bone / P3
- Trachten = Heel bulbs | Weiße Linie = White line
- Lahmheit 1-5 (AAEP): 0=keine, 5=Stützlahmheit
- Pulsation = erhöhter Puls an Zehenarterie (Rehe-Zeichen)
`;

export function getHorseKnowledgeForRole(userRole: string | null): string {
  if (userRole === "provider") {
    return HORSE_KNOWLEDGE_PROMPT + `
HUF-BUSINESS TIPPS (für Hufbearbeiter):
- Abo-Modell (4/6/8 Wo.) = planbare Einnahmen
- Wetter → nicht absagen, Kunden informieren
- Fotos vor/nach = Rechtssicherheit + Marketing
- Überfällige Pferde: Besitzer automatisch erinnern
- Tour-Optimierung = weniger Fahrzeit = mehr Gewinn
`;
  }
  return HORSE_KNOWLEDGE_PROMPT;
}
