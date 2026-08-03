// Minimale, laufzeitumgebungs-unabhängige Assertion-Helfer — bewusst ohne
// Node-"assert"-Import, damit diese Dateien keine Annahmen über die
// Ausführungsumgebung treffen (siehe README.md in diesem Ordner).

export function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FEHLGESCHLAGEN: ${message}`);
  }
  console.log(`OK: ${message}`);
}

export function assertFalse(condition: boolean, message: string): void {
  assertTrue(!condition, message);
}
