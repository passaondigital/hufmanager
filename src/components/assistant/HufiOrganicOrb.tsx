// Organische Hufi-Präsenz für den Light-Idle-Zustand -- nach der
// verbindlichen Referenz "hufi neu.png": oranger Mittelpunkt, umgeben von
// unregelmäßigen, unterbrochenen Ring-Segmenten (keine perfekten Kreise),
// ruhige, langsame Bewegung. Schlanke SVG-/CSS-Umsetzung, kein Fantasie-
// Redesign -- Radien/Winkel/Lücken sind an der Referenz orientiert.
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

// Drei Ringe, je mit 2 unterbrochenen Segmenten und leicht unterschiedlichem
// Radius/Winkel -- ergibt die unregelmäßige, "handgezeichnete" Kontur statt
// eines glatten Kreises.
const RINGS = [
  { r: 25, segs: [[10, 150], [190, 330]], width: 2.4, opacity: 0.55 },
  { r: 31, segs: [[60, 170], [220, 20]], width: 2, opacity: 0.4 },
  { r: 37, segs: [[300, 80], [140, 250]], width: 1.6, opacity: 0.28 },
];

export function HufiOrganicOrb({ onTap, size = 96 }: { onTap?: () => void; size?: number }) {
  const body = (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g className="hufi-orb-rings" style={{ transformOrigin: "50px 50px" }}>
        {RINGS.map((ring, i) =>
          ring.segs.map(([a, b], j) => (
            <path
              key={`${i}-${j}`}
              d={arcPath(50, 50, ring.r, a, b < a ? b + 360 : b)}
              fill="none"
              stroke="#F97316"
              strokeOpacity={ring.opacity}
              strokeWidth={ring.width}
              strokeLinecap="round"
            />
          ))
        )}
      </g>
      <circle cx="50" cy="50" r="9" fill="#F97316" className="hufi-orb-core" />
    </svg>
  );

  if (!onTap) {
    return <div aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{body}</div>;
  }
  return (
    <button type="button" onClick={onTap} aria-label="Hufi ansprechen" className="hlab-focusable" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
      {body}
    </button>
  );
}
