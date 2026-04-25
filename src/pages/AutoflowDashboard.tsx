import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// ── Design tokens (match HTML template exactly) ────────────────────────────
const C = {
  or:  "#e8a020",
  or2: "rgba(232,160,32,.15)",
  or3: "rgba(232,160,32,.08)",
  gr:  "#7ab87a",
  gr2: "rgba(122,184,122,.15)",
  gr3: "rgba(122,184,122,.08)",
  s2:  "#232323",
  s3:  "#2a2a2a",
  b:   "#303030",
  b2:  "#3a3a3a",
  tx:  "#f0ece4",
  tx2: "#999",
  tx3: "#555",
  red: "#e06050",
  bg:  "#1c1c1c",
} as const;

type Mode = "auto" | "manuell";

// ── Shared sub-components ──────────────────────────────────────────────────

function TopBar({
  isPro, mode, onToggle,
}: { isPro: boolean; mode: Mode; onToggle: () => void }) {
  const ac = isPro ? C.or : C.gr;
  const isAuto = mode === "auto";
  return (
    <div style={{ borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}
      className="flex items-center justify-between px-5 py-[18px]">
      <div className="flex items-center gap-2.5">
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: isPro ? C.or : C.gr,
          color: isPro ? "#1a0f00" : "#071407",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, letterSpacing: "-.5px", flexShrink: 0,
        }}>H</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.3px", color: C.tx }}>HufManager</div>
          <div style={{ fontSize: 10, color: C.tx2, marginTop: 1 }}>
            {mode === "auto" ? (isPro ? "Heute · 14 Pferde" : "Meine Pferde") : "Manueller Modus"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Toggle */}
        <button onClick={onToggle} className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer">
          <div style={{
            width: 34, height: 19, borderRadius: 10, position: "relative",
            background: isAuto ? ac : C.b2, transition: "background .2s",
          }}>
            <div style={{
              position: "absolute", width: 13, height: 13, borderRadius: "50%",
              background: "#fff", top: 3, transition: "left .2s",
              left: isAuto ? "auto" : 3, right: isAuto ? 3 : "auto",
            }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: isAuto ? ac : C.tx2 }}>
            {isAuto ? "Auto" : "Manuell"}
          </span>
        </button>
        {/* Badge */}
        <div style={{
          padding: "3px 9px", borderRadius: 20, fontSize: 9, fontWeight: 700,
          letterSpacing: ".06em", textTransform: "uppercase",
          background: isPro ? C.or2 : C.gr2,
          color: isPro ? C.or : C.gr,
          border: `1px solid ${isPro ? "rgba(232,160,32,.3)" : "rgba(122,184,122,.3)"}`,
        }}>
          {isPro ? "Pro" : "Besitzer"}
        </div>
      </div>
    </div>
  );
}

function BottomNav({
  isPro, active, onAssistent, onChat, onMehr,
}: { isPro: boolean; active: string; onAssistent: () => void; onChat: () => void; onMehr: () => void }) {
  const ac = isPro ? C.or : C.gr;
  const acBg = isPro ? C.or3 : C.gr3;
  const items = isPro
    ? [
        { key: "assistent", ic: "💬", lb: "Assistent", fn: onAssistent },
        { key: "pferde",    ic: "🐴", lb: "Pferde",    fn: onAssistent },
        { key: "chat",      ic: "✉️", lb: "Chat",      fn: onChat },
        { key: "termine",   ic: "📅", lb: "Termine",   fn: onAssistent },
        { key: "mehr",      ic: "⋯",  lb: "Mehr",      fn: onMehr },
      ]
    : [
        { key: "assistent", ic: "💬", lb: "Assistent", fn: onAssistent },
        { key: "pferde",    ic: "🐴", lb: "Pferde",    fn: onAssistent },
        { key: "chat",      ic: "✉️", lb: "Chat",      fn: onChat },
        { key: "akten",     ic: "📋", lb: "Akten",     fn: onAssistent },
        { key: "mehr",      ic: "⋯",  lb: "Mehr",      fn: onMehr },
      ];
  return (
    <div style={{ borderTop: `1px solid ${C.b}`, flexShrink: 0 }}
      className="flex justify-around px-3 py-2">
      {items.map(({ key, ic, lb, fn }) => {
        const on = active === key;
        return (
          <button key={key} onClick={fn}
            style={{
              background: on ? acBg : "transparent",
              borderRadius: 10, border: "none", cursor: "pointer",
              padding: "5px 10px", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 2,
            }}>
            <span style={{ fontSize: 17 }}>{ic}</span>
            <span style={{ fontSize: 8, fontWeight: 500, letterSpacing: ".02em", color: on ? ac : C.tx3 }}>{lb}</span>
          </button>
        );
      })}
    </div>
  );
}

function HorseCard({ isPro }: { isPro: boolean }) {
  return (
    <div style={{
      background: C.s2, border: `1px solid ${C.b}`, borderRadius: 14,
      padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: "linear-gradient(135deg,#3a2e1e,#6b5230)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
      }}>🐴</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-.2px", color: C.tx }}>Fridolin</div>
        <div style={{ fontSize: 10, color: C.tx2, marginTop: 1 }}>
          {isPro ? "Hannoveraner · 12 J · Wallach" : "Heute bearbeitet · Pascal S."}
        </div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
        {isPro ? (
          <>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(232,160,32,.25)", color: C.or, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.bg}` }}>PS</div>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(122,184,122,.25)", color: C.gr, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.bg}` }}>AM</div>
          </>
        ) : (
          <span style={{ fontSize: 10, color: C.gr, fontWeight: 700 }}>Neu</span>
        )}
      </div>
    </div>
  );
}

function AiMsg({ text, ts, isPro }: { text: string; ts: string; isPro: boolean }) {
  const ac = isPro ? C.or : C.gr;
  const acBg = isPro ? "rgba(232,160,32,.2)" : "rgba(122,184,122,.2)";
  const acBorder = isPro ? "rgba(232,160,32,.25)" : "rgba(122,184,122,.25)";
  return (
    <div style={{ display: "flex", gap: 7, alignItems: "flex-start", flexShrink: 0 }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: acBg, color: ac, border: `1px solid ${acBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>H</div>
      <div>
        <div style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 14, borderTopLeftRadius: 3, padding: "9px 12px", fontSize: 12, lineHeight: 1.55, maxWidth: "80%", color: C.tx }}
          dangerouslySetInnerHTML={{ __html: text }} />
        <div style={{ fontSize: 9, color: C.tx3, marginTop: 3, fontFamily: "monospace" }}>{ts}</div>
      </div>
    </div>
  );
}

function UserVoiceMsg() {
  return (
    <div style={{ display: "flex", flexDirection: "row-reverse", gap: 7, alignItems: "flex-start", flexShrink: 0 }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: C.s3, color: C.tx2, border: `1px solid ${C.b}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>PS</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "rgba(232,160,32,.1)", border: "1px solid rgba(232,160,32,.18)", borderRadius: 14, borderTopRightRadius: 3, maxWidth: "80%" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.or, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>🎙</div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
            {[7, 14, 10, 19, 9, 15, 7, 12].map((h, i) => (
              <div key={i} style={{ width: 2.5, height: h, background: C.or, borderRadius: 2, opacity: .65 }} />
            ))}
          </div>
          <span style={{ fontSize: 9, color: C.or, fontFamily: "monospace" }}>0:14</span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, color: C.tx3, fontFamily: "monospace", background: C.s2, border: `1px solid ${C.b}`, padding: "2px 7px", borderRadius: 5, marginTop: 4 }}>📍 48.12°N · jetzt</div>
        <div style={{ fontSize: 9, color: C.tx3, marginTop: 3, fontFamily: "monospace", textAlign: "right" }}>14:03</div>
      </div>
    </div>
  );
}

function AutoFlowCard() {
  const steps = [
    { label: "Voice transkribiert",    done: true,  active: false },
    { label: "Pferdeakte aktualisiert",done: true,  active: false },
    { label: "Rechnung wird erstellt…",done: false, active: true  },
    { label: "Rechnung versenden",      done: false, active: false },
    { label: "Buchhaltung",             done: false, active: false },
  ];
  const icons = ["✓", "✓", "⚙", "✉", "📊"];
  return (
    <div style={{ background: C.s2, border: "1px solid rgba(232,160,32,.22)", borderRadius: 14, padding: 12, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: C.or, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.gr, display: "inline-block", boxShadow: `0 0 5px ${C.gr}` }} />
          Autoflow aktiv
        </div>
        <div style={{ width: 28, height: 16, borderRadius: 8, background: C.or, position: "relative" }}>
          <div style={{ position: "absolute", width: 10, height: 10, borderRadius: "50%", background: "#fff", top: 3, right: 3 }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
            <div style={{
              width: 21, height: 21, borderRadius: 7, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9,
              background: s.done ? "rgba(122,184,122,.2)" : s.active ? "rgba(232,160,32,.2)" : C.bg,
              border: (!s.done && !s.active) ? `1px solid ${C.b}` : "none",
            }}>{icons[i]}</div>
            <span style={{
              flex: 1,
              color: s.done ? C.tx2 : s.active ? C.or : C.tx3,
              textDecoration: s.done ? "line-through" : "none",
            }}>{s.label}</span>
            {s.done && <span style={{ fontSize: 10, color: C.gr }}>✓</span>}
            {s.active && (
              <div style={{
                width: 11, height: 11,
                border: `1.5px solid rgba(232,160,32,.25)`,
                borderTopColor: C.or,
                borderRadius: "50%",
                animation: "afSpin .8s linear infinite",
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function InputBar({ isPro, recording, onRecord }: { isPro: boolean; recording: boolean; onRecord: () => void }) {
  const ac = isPro ? C.or : C.gr;
  return (
    <div style={{ padding: "10px 14px 20px", borderTop: `1px solid ${C.b}`, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.s2, border: `1px solid ${C.b}`, borderRadius: 22, padding: "6px 6px 6px 14px" }}>
        <span style={{ flex: 1, fontSize: 12, color: C.tx2 }}>
          {isPro ? "Sprich oder schreib…" : "Schreib oder sprich…"}
        </span>
        {isPro && (
          <button style={{ width: 33, height: 33, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "transparent", border: "none", cursor: "pointer", color: C.tx2 }}>📷</button>
        )}
        <button
          onClick={onRecord}
          style={{
            width: 33, height: 33, borderRadius: "50%", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isPro ? (recording ? C.red : C.or) : C.gr,
            color: "#1a0f00", fontSize: 12, fontWeight: 700,
          }}>
          {isPro ? (recording ? "■" : "●") : "▶"}
        </button>
      </div>
    </div>
  );
}

// ── Pro Auto Screen ────────────────────────────────────────────────────────

function ProAutoScreen({ onToggle, onChat, onMehr }: { onToggle: () => void; onChat: () => void; onMehr: () => void }) {
  const [recording, setRecording] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar isPro mode="auto" onToggle={onToggle} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
        <HorseCard isPro />
        <AiMsg isPro text="Fridolin steht heute an. Letzter Besuch vor 6 Wochen — Weißlinie VL. Akte offen?" ts="14:02" />
        <UserVoiceMsg />
        <AiMsg isPro text="Weißlinie VL gebessert, Strahl weich, Trachten ausgeglichen. Autoflow läuft. 🐴" ts="14:03" />
        <AutoFlowCard />
        <AiMsg isPro text={`Nächstes Pferd: <strong style="color:${C.or}">Luna</strong> — Holsteiner, 8 J. In 20 Min.`} ts="14:04" />
      </div>
      <InputBar isPro recording={recording} onRecord={() => setRecording(r => !r)} />
      <BottomNav isPro active="assistent" onAssistent={() => {}} onChat={onChat} onMehr={onMehr} />
    </div>
  );
}

// ── Pro Manual Screen ──────────────────────────────────────────────────────

const PRO_NAV = [
  { sec: "Anfragen & Angebote", items: [
    { icon: "📥", bg: "or", name: "Anfragen",    desc: "Inbox · Warteliste",            badge: "6" },
    { icon: "📄", bg: "or", name: "Angebote",    desc: "Mein Angebot · Offene Angebote" },
  ]},
  { sec: "Aufnahme", items: [
    { icon: "👥", bg: "or", name: "Kunden", desc: "Kundenverwaltung" },
    { icon: "🐴", bg: "or", name: "Pferde", desc: "Pferdeakten · Befunde" },
  ]},
  { sec: "Auffassen", items: [
    { icon: "📅", bg: "or", name: "Kalender",    desc: "Tages-Cockpit · Termine" },
    { icon: "📷", bg: "or", name: "HufCam Pro",  desc: "Hufanalyse · Fotos" },
  ]},
  { sec: "Analyse & Business", items: [
    { icon: "💰", bg: "or",  name: "Rechnungen",    desc: "Ausgaben · Belege" },
    { icon: "📊", bg: "or",  name: "Buchhaltung",   desc: "GuV · Betriebszahlen" },
    { icon: "🗺️", bg: "neu", name: "Routenplanung", desc: "Tour · Fuhrpark" },
  ]},
];

const OWN_NAV = [
  { sec: "Meine Pferde", items: [
    { icon: "🐴", bg: "gr", name: "Pferdeakte",  desc: "Befunde · Fotos · Verlauf" },
    { icon: "📋", bg: "gr", name: "Dokumente",   desc: "Pass · Impfungen · Formulare" },
  ]},
  { sec: "Netzwerk", items: [
    { icon: "🔗", bg: "gr",  name: "Hufi Connect",          desc: "Verbundene Experten" },
    { icon: "🔍", bg: "gr",  name: "Experten-Verzeichnis", desc: "Hufbearbeiter · Tierärzte finden" },
    { icon: "🛒", bg: "gr",  name: "Pferdemarkt",          desc: "Kaufen · Verkaufen" },
  ]},
  { sec: "Verwaltung", items: [
    { icon: "🛡",  bg: "neu", name: "Berechtigungen", desc: "Wer sieht was" },
    { icon: "📍",  bg: "neu", name: "Standorte",       desc: "Stall · Box" },
    { icon: "🚨",  bg: "neu", name: "Notfall",          desc: "Notfallkontakte" },
  ]},
];

function NavMenu({ isPro, onToggle, onChat, onMehr }: { isPro: boolean; onToggle: () => void; onChat: () => void; onMehr: () => void }) {
  const nav = isPro ? PRO_NAV : OWN_NAV;
  const iconBg = (bg: string) => bg === "or" ? C.or2 : bg === "gr" ? C.gr2 : C.s3;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar isPro={isPro} mode="manuell" onToggle={onToggle} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
        {nav.map(({ sec, items }) => (
          <div key={sec} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.tx3, letterSpacing: ".1em", textTransform: "uppercase", padding: "2px 2px 0" }}>{sec}</div>
            {items.map((item) => (
              <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", background: C.s2, border: `1px solid ${C.b}`, borderRadius: 10, cursor: "pointer" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg(item.bg), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-.2px", color: C.tx }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: C.tx2, marginTop: 1 }}>{item.desc}</div>
                </div>
                {"badge" in item && item.badge && (
                  <div style={{ background: "#e06050", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>{item.badge}</div>
                )}
                <span style={{ fontSize: 16, color: C.tx3 }}>›</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <BottomNav isPro={isPro} active="mehr" onAssistent={onToggle} onChat={onChat} onMehr={() => {}} />
    </div>
  );
}

// ── Owner Auto Screen ──────────────────────────────────────────────────────

function BefundCard() {
  return (
    <div style={{ background: C.s2, border: "1px solid rgba(122,184,122,.22)", borderRadius: 14, padding: 12, flexShrink: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.gr, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 7 }}>Befund · 18.04.2026</div>
      <div style={{ fontSize: 12, lineHeight: 1.6, color: C.tx }}>Weißlinie VL gebessert, Strahl etwas weich, Trachten ausgeglichen.</div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, color: C.tx3, fontFamily: "monospace", background: C.bg, border: `1px solid ${C.b}`, padding: "2px 7px", borderRadius: 5, marginTop: 8 }}>📍 Stall Sonnenhof · 14:03</div>
    </div>
  );
}

function NoteCard() {
  return (
    <div style={{ background: C.gr3, border: "1px solid rgba(122,184,122,.2)", borderRadius: 10, padding: "9px 11px", fontSize: 11, color: C.gr, lineHeight: 1.5, flexShrink: 0 }}>
      Rechnung €65 per E-Mail. Nächster Termin in 6 Wochen.
    </div>
  );
}

function OwnerAutoScreen({ onToggle, onChat, onMehr }: { onToggle: () => void; onChat: () => void; onMehr: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar isPro={false} mode="auto" onToggle={onToggle} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
        <HorseCard isPro={false} />
        <AiMsg isPro={false} text="Hallo Anna! Pascal hat heute Fridolin bearbeitet:" ts="14:05" />
        <BefundCard />
        <NoteCard />
        <AiMsg isPro={false} text="Fragen zum Befund oder Nachricht an Pascal?" ts="14:06" />
      </div>
      <InputBar isPro={false} recording={false} onRecord={() => {}} />
      <BottomNav isPro={false} active="assistent" onAssistent={() => {}} onChat={onChat} onMehr={onMehr} />
    </div>
  );
}

// ── Registration Screen ────────────────────────────────────────────────────

function RegScreen({ onSelectPro, onSelectOwner }: { onSelectPro: () => void; onSelectOwner: () => void }) {
  const [sel, setSel] = useState<"pro" | "own">("pro");
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 24px", gap: 22 }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: sel === "pro" ? C.or : C.gr, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: sel === "pro" ? "#1a0f00" : "#071407" }}>H</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.5px", color: C.tx }}>Willkommen</div>
        <div style={{ fontSize: 12, color: C.tx2, marginTop: 6, lineHeight: 1.6 }}>Wie möchtest du HufManager nutzen?</div>
      </div>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { key: "pro" as const, dot: C.or, title: "Gewerblich", sub: "Hufbearbeiter · Osteopath · Physiotherapeut · Trainer" },
          { key: "own" as const, dot: C.gr, title: "Privat",      sub: "Pferdebesitzer · Hobbyreiter" },
        ].map(({ key, dot, title, sub }) => {
          const isSel = sel === key;
          return (
            <button key={key} onClick={() => setSel(key)}
              style={{
                width: "100%", padding: 16, borderRadius: 14, textAlign: "left", cursor: "pointer",
                border: `1.5px solid ${isSel ? dot : C.b}`,
                background: isSel ? (key === "pro" ? C.or3 : C.gr3) : C.s2,
                transition: "all .2s",
              }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.tx, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, display: "inline-block" }} />
                {title}
              </div>
              <div style={{ fontSize: 11, color: C.tx2, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
            </button>
          );
        })}
      </div>
      <button
        onClick={sel === "pro" ? onSelectPro : onSelectOwner}
        style={{
          width: "100%", padding: 14, borderRadius: 12, border: "none", cursor: "pointer",
          background: sel === "pro" ? C.or : C.gr,
          color: "#1a0f00", fontSize: 14, fontWeight: 700,
        }}>
        Los geht's →
      </button>
      <div style={{ fontSize: 11, color: C.tx2, textAlign: "center" }}>
        Bereits registriert? <span style={{ color: C.or, cursor: "pointer" }} onClick={onSelectPro}>Anmelden</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

type Screen = "reg" | "pro-auto" | "pro-man" | "own-auto" | "own-man" | "chat";

export default function AutoflowDashboard() {
  const { userType } = useAuth();
  const initialScreen: Screen = userType === "owner" ? "own-auto" : userType === "pro" ? "pro-auto" : "reg";
  const [screen, setScreen] = useState<Screen>(initialScreen);

  const go = (s: Screen) => setScreen(s);

  return (
    <>
      {/* Inject spin keyframe */}
      <style>{`@keyframes afSpin{to{transform:rotate(360deg)}}`}</style>

      <div style={{
        minHeight: "100dvh", background: "#111111",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px 0",
      }}>
      <div style={{
        width: "100%", maxWidth: 375, margin: "0 auto",
        background: C.bg, border: `1px solid ${C.b}`,
        borderRadius: 28, overflow: "hidden",
        minHeight: 720, display: "flex", flexDirection: "column",
        fontFamily: "'DM Sans', 'Outfit', sans-serif",
        color: C.tx, position: "relative",
      }}>
        {screen === "reg" && (
          <RegScreen onSelectPro={() => go("pro-auto")} onSelectOwner={() => go("own-auto")} />
        )}
        {screen === "pro-auto" && (
          <ProAutoScreen onToggle={() => go("pro-man")} onChat={() => go("chat")} onMehr={() => go("pro-man")} />
        )}
        {screen === "pro-man" && (
          <NavMenu isPro onToggle={() => go("pro-auto")} onChat={() => go("chat")} onMehr={() => {}} />
        )}
        {screen === "own-auto" && (
          <OwnerAutoScreen onToggle={() => go("own-man")} onChat={() => go("chat")} onMehr={() => go("own-man")} />
        )}
        {screen === "own-man" && (
          <NavMenu isPro={false} onToggle={() => go("own-auto")} onChat={() => go("chat")} onMehr={() => {}} />
        )}
        {screen === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: `1px solid ${C.b}` }}>
              <div className="flex items-center gap-2.5">
                <div style={{ width: 32, height: 32, borderRadius: 9, background: C.or, color: "#1a0f00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>H</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.tx }}>Nachrichten</div>
                  <div style={{ fontSize: 10, color: C.tx2, marginTop: 1 }}>3 ungelesen</div>
                </div>
              </div>
              <div style={{ padding: "3px 9px", borderRadius: 20, fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", background: C.or2, color: C.or, border: "1px solid rgba(232,160,32,.3)" }}>Pro</div>
            </div>
            <div style={{ display: "flex", borderBottom: `1px solid ${C.b}`, flexShrink: 0 }}>
              {["Privat", "Experten", "Gruppe"].map((t, i) => (
                <div key={t} style={{ flex: 1, padding: "11px 6px", textAlign: "center", fontSize: 11, fontWeight: 500, cursor: "pointer", color: i === 0 ? C.or : C.tx2, borderBottom: i === 0 ? `2px solid ${C.or}` : "2px solid transparent" }}>{t}</div>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
              {[
                { av: "👩", name: "Anna M. · Fridolin",  prev: "Danke für den Befund!", time: "14:06", unread: 2 },
                { av: "👨", name: "Markus H. · Luna",    prev: "Termin nächste Woche?",  time: "09:18" },
                { av: "👩", name: "Sandra K. · Blitz",   prev: "Rechnung angekommen ✓", time: "Gst." },
              ].map((c) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${C.b}`, cursor: "pointer" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.s3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{c.av}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.tx }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: C.tx2, marginTop: 2 }}>{c.prev}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontSize: 9, color: C.tx3, fontFamily: "monospace" }}>{c.time}</div>
                    {c.unread && <div style={{ background: C.or, color: "#1a0f00", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{c.unread}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 14px 20px", borderTop: `1px solid ${C.b}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.s2, border: `1px solid ${C.b}`, borderRadius: 22, padding: "6px 6px 6px 14px" }}>
                <span style={{ flex: 1, fontSize: 12, color: C.tx2 }}>Nachricht schreiben…</span>
                <button style={{ width: 33, height: 33, borderRadius: "50%", background: "transparent", border: "none", fontSize: 14, cursor: "pointer", color: C.tx2 }}>📎</button>
                <button style={{ width: 33, height: 33, borderRadius: "50%", background: C.or, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#1a0f00" }}>▶</button>
              </div>
            </div>
            <BottomNav isPro active="chat" onAssistent={() => go("pro-auto")} onChat={() => {}} onMehr={() => go("pro-man")} />
          </div>
        )}
      </div>
      </div>
    </>
  );
}
