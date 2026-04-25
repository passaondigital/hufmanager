import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ORANGE = "#F97316";
const pascalImage = "https://upload.assaon.com/files/medien/pascalschmid.png";

function Btn({ children, onClick, variant = "primary", fullWidth = false }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}) {
  const base: React.CSSProperties = {
    height: 48, padding: "0 28px", borderRadius: 999, fontSize: 14,
    fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.18s ease", width: fullWidth ? "100%" : undefined, border: "none",
  };
  const styles: Record<string, React.CSSProperties> = {
    primary:   { ...base, background: ORANGE, color: "#FFF", boxShadow: "0 4px 18px rgba(249,115,22,0.4)" },
    secondary: { ...base, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.4)", color: ORANGE },
    ghost:     { ...base, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#FFF" },
  };
  return (
    <button style={styles[variant]} onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1";    e.currentTarget.style.transform = "translateY(0)"; }}
    >{children}</button>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 52 }}>
      <h2 style={{ fontFamily: "'Bebas Neue','Arial Black',sans-serif", fontSize: "clamp(32px,6vw,58px)", fontWeight: 400, color: "#FFF", margin: "0 0 10px", letterSpacing: ".02em", lineHeight: 1 }}>
        {children}
      </h2>
      {sub && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15, margin: 0, fontStyle: "italic" }}>{sub}</p>}
    </div>
  );
}

function Check({ label, yes = true }: { label: string; yes?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
      <span style={{ color: yes ? "#10B981" : "rgba(255,255,255,0.2)", fontSize: 14, flexShrink: 0, marginTop: 1 }}>{yes ? "✅" : "❌"}</span>
      <span style={{ color: yes ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.25)", fontSize: 13, lineHeight: 1.5 }}>{label}</span>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem("huf_migration_banner_v3") === "1"
  );

  return (
    <div style={{ background: "#0a0700", minHeight: "100vh", color: "#FFF", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        @keyframes goldGlow {
          0%,100% { filter: drop-shadow(0 0 40px rgba(249,179,22,.3)) drop-shadow(0 0 80px rgba(249,115,22,.15)); }
          50%      { filter: drop-shadow(0 0 70px rgba(249,179,22,.5)) drop-shadow(0 0 130px rgba(249,115,22,.3)); }
        }
        .gold-horse { animation: goldGlow 3.5s ease-in-out infinite; }
        @media (max-width: 768px) {
          .hero-horse   { opacity:.08!important; width:100%!important; right:-5%!important; top:0!important; transform:none!important; }
          .hero-content { padding-top:80px!important; min-height:auto!important; }
          .hero-wrap    { min-height:auto!important; padding-bottom:60px; }
        }
        .sec { padding:88px 24px; border-top:1px solid rgba(255,255,255,.06); }
        @media (max-width:640px) { .sec { padding:56px 18px!important; } }

        .pain-grid       { display:grid; gap:16px; grid-template-columns:1fr; }
        @media (min-width:700px) { .pain-grid { grid-template-columns:repeat(3,1fr); } }

        .eco-roles       { display:grid; gap:14px; grid-template-columns:1fr; }
        @media (min-width:560px) { .eco-roles { grid-template-columns:repeat(2,1fr); } }
        @media (min-width:960px) { .eco-roles { grid-template-columns:repeat(4,1fr); } }

        .data-checks     { display:grid; gap:10px; grid-template-columns:1fr; }
        @media (min-width:560px) { .data-checks { grid-template-columns:repeat(2,1fr); } }
        @media (min-width:900px) { .data-checks { grid-template-columns:repeat(3,1fr); } }

        .grid-features   { display:grid; gap:18px; grid-template-columns:1fr; }
        @media (min-width:700px) { .grid-features { grid-template-columns:repeat(3,1fr); } }

        .grid-pricing    { display:grid; gap:16px; grid-template-columns:1fr; margin-bottom:24px; }
        @media (min-width:560px) { .grid-pricing { grid-template-columns:repeat(2,1fr); } }
        @media (min-width:980px) { .grid-pricing { grid-template-columns:repeat(4,1fr); } }

        .ki-credits-row  { display:flex; flex-wrap:wrap; gap:14px; margin-bottom:16px; }
        @media (max-width:480px) { .ki-credits-row > div { width:100%; } }

        .founder-layout  { display:flex; gap:48px; align-items:flex-start; }
        .founder-photo   { flex-shrink:0; width:220px; }
        @media (max-width:700px) {
          .founder-layout { flex-direction:column-reverse; gap:28px; }
          .founder-photo  { width:100%; max-width:260px; margin:0 auto; }
        }

        .testimonial-grid { display:grid; gap:16px; grid-template-columns:1fr; }
        @media (min-width:600px) { .testimonial-grid { grid-template-columns:repeat(3,1fr); } }

        .manifest-pillars { display:flex; gap:32px; flex-wrap:wrap; justify-content:center; }
      `}</style>

      {/* ── MIGRATION BANNER ── */}
      {!bannerDismissed && (
        <div style={{ background: "linear-gradient(90deg,#ea6a0a,#F97316 60%,#f59e1a)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 220 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🐴</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#FFF", marginBottom: 2 }}>HufManager heißt jetzt Hufi!</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.85)", lineHeight: 1.5 }}>Deine Daten, dein Abo, dein Login — alles bleibt bestehen. Nur ein neuer Name und viele neue Features.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button onClick={() => navigate("/auth")} style={{ height: 38, padding: "0 18px", background: "#FFF", color: ORANGE, border: "none", borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Jetzt einloggen →</button>
            <button onClick={() => { localStorage.setItem("huf_migration_banner_v3","1"); setBannerDismissed(true); }} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.6)", fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1, fontFamily: "inherit" }} aria-label="Schließen">×</button>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="hero-wrap" style={{ position: "relative", overflow: "hidden", minHeight: "100vh" }}>
        <div className="hero-horse" style={{ position: "absolute", right: "-2%", top: "50%", transform: "translateY(-50%)", width: "50%", maxWidth: 600, pointerEvents: "none", zIndex: 0 }}>
          <img src="https://upload.assaon.com/files/medien/goldenespferd.png" alt="" className="gold-horse" style={{ width: "100%", height: "auto", transform: "scaleX(-1)" }} />
        </div>

        <div className="hero-content" style={{ position: "relative", zIndex: 1, maxWidth: 580, padding: "70px 24px 80px", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ marginBottom: 36 }}>
            <img src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" alt="Hufi" style={{ height: 48, objectFit: "contain" }} />
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(249,115,22,.14)", border: "1px solid rgba(249,115,22,.4)", borderRadius: 999, padding: "5px 16px", marginBottom: 22, width: "fit-content" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: ORANGE, letterSpacing: ".05em" }}>Deine Zeit gehört dem Pferd</span>
          </div>

          <h1 style={{ fontFamily: "'Bebas Neue','Arial Black',sans-serif", fontSize: "clamp(46px,8.5vw,90px)", fontWeight: 400, lineHeight: 0.95, margin: "0 0 22px", color: "#FFF", letterSpacing: ".02em" }}>
            Deine Zeit<br />
            gehört dem Pferd.<br />
            <span style={{ color: ORANGE }}>Den Rest macht Hufi.</span>
          </h1>

          <p style={{ fontSize: "clamp(14px,2.2vw,17px)", color: "rgba(255,255,255,.55)", margin: "0 0 8px", lineHeight: 1.7 }}>
            Pferd. Mensch. Business. — alles verbunden.
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.3)", margin: "0 0 36px", fontStyle: "italic" }}>
            Technologie ist das Werkzeug. Das Pferd ist das Ziel.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
            <Btn onClick={() => navigate("/auth")}>Kostenlos starten →</Btn>
            <Btn variant="ghost" onClick={() => document.getElementById("manifest")?.scrollIntoView({ behavior: "smooth" })}>Mehr erfahren</Btn>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["🔒 DSGVO-konform", "🇩🇪 Deutsche Server", "⚡ 24/7 verfügbar", "🤖 EU AI Act", "📱 Kein App Store"].map(b => (
              <span key={b} style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,.4)", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 999, padding: "4px 12px" }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── MANIFEST ── */}
      <section id="manifest" className="sec">
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: ORANGE, marginBottom: 24 }}>Die Stimme des Pferdes</p>

          <h2 style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: "clamp(26px,5vw,50px)", fontStyle: "italic", color: "#FFF", lineHeight: 1.35, margin: "0 0 28px", fontWeight: 400 }}>
            "Pferde können nicht sprechen.<br />Aber sie haben eine Stimme."
          </h2>

          <p style={{ fontSize: "clamp(14px,2vw,17px)", color: "rgba(255,255,255,.45)", lineHeight: 1.85, maxWidth: 620, margin: "0 auto 20px" }}>
            Vor über 5.500 Jahren hat das Pferd die Welt des Menschen verändert — ohne je gehört zu werden. Es hat uns Kontinente erschlossen, Kriege entschieden, Felder bestellt. Die folgenreichste Partnerschaft der Menschheitsgeschichte.
          </p>
          <p style={{ fontSize: "clamp(14px,2vw,17px)", color: "rgba(255,255,255,.7)", lineHeight: 1.85, maxWidth: 620, margin: "0 auto 44px", fontWeight: 500 }}>
            Hufi gibt dem Pferd diese Stimme. Dir gibt Hufi Klarheit. Deinem Business gibt Hufi Struktur. Niemand soll alleine sein — nicht mit seinen Daten, nicht mit seinen Fragen, nicht mit seinem Pferd.
          </p>

          <div className="manifest-pillars">
            {[
              { label: "Bewusstsein", desc: "Verstehen was dein Pferd wirklich braucht", icon: "🐴" },
              { label: "Klarheit",    desc: "Wissen was in deinem Business passiert",    icon: "💡" },
              { label: "Handeln",    desc: "Informiert. Sicher. Nie allein.",             icon: "🤝" },
            ].map(p => (
              <div key={p.label} style={{ textAlign: "center", minWidth: 160 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{p.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: ORANGE, marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCHMERZ ── */}
      <section className="sec">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <h2 style={{ fontFamily: "'Bebas Neue','Arial Black',sans-serif", fontSize: "clamp(32px,6vw,58px)", fontWeight: 400, color: "#FFF", margin: "0 0 8px", letterSpacing: ".02em", lineHeight: 1 }}>
              Nach dem letzten Pferd<br />fängt die Arbeit an.
            </h2>
            <p style={{ color: ORANGE, fontSize: 17, margin: 0, fontWeight: 600 }}>Mit Hufi nicht mehr.</p>
          </div>

          <div className="pain-grid">
            {[
              { icon: "🗺️", title: "Jeder Tag neu planen.", text: "Welche Reihenfolge? Welche Route? Wer ist wo? Das kostet Kopf — bevor du überhaupt im Stall bist." },
              { icon: "📋", title: "Befunde irgendwo. Fotos im Handy.", text: "In drei Monaten weißt du was du heute gemacht hast — aber nicht mehr wo. Das darf nicht so sein." },
              { icon: "💸", title: "Rechnungen die du vergisst.", text: "Nicht aus Großzügigkeit. Aus Zeitmangel. Geld das du verdient hast — und nie siehst." },
            ].map(c => (
              <div key={c.title} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "28px 24px" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{c.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#FFF", margin: "0 0 12px", lineHeight: 1.3 }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", lineHeight: 1.75, margin: 0 }}>{c.text}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 36 }}>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.4)", fontStyle: "italic", marginBottom: 20 }}>Das sind keine Ausnahmen. Das ist Pferdealltag.</p>
            <Btn onClick={() => navigate("/auth")}>Hufi macht das anders →</Btn>
          </div>
        </div>
      </section>

      {/* ── IKIGAI ── */}
      <section className="sec">
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <SectionTitle sub="Drei Welten. Ein Kern. Ein Werkzeug.">
            Das Pferd. Der Mensch. Das Business.
          </SectionTitle>

          {/* Three needs columns */}
          <div className="eco-roles" style={{ marginBottom: 44 }}>
            {[
              {
                icon: "🐴", label: "DAS PFERD", color: ORANGE,
                needs: ["Sicherheit & Geborgenheit", "Gesundheit & Wohlergehen", "Verstanden werden", "Eine Stimme haben"],
                goal: "Hufi gibt dem Pferd eine Stimme.",
              },
              {
                icon: "👤", label: "DER MENSCH", color: "#3B82F6",
                needs: ["Zeit für das Pferd", "Klarheit statt Chaos", "Vertrauen in die Daten", "Nie allein sein"],
                goal: "Hufi gibt dir Ruhe und Klarheit.",
              },
              {
                icon: "🏢", label: "DAS BUSINESS", color: "#8B5CF6",
                needs: ["Struktur & Übersicht", "Stabilität & Planbarkeit", "Wachstum ohne Aufwand", "Rechtssicherheit"],
                goal: "Hufi gibt deinem Business Fundament.",
              },
            ].map(col => (
              <div key={col.label} style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${col.color}33`, borderRadius: 22, padding: "28px 22px", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>{col.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: col.color, textTransform: "uppercase", marginBottom: 18 }}>{col.label}</div>
                <div style={{ flex: 1, marginBottom: 20 }}>
                  {col.needs.map((n, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: col.color, flexShrink: 0, opacity: 1 - i * 0.15 }} />
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.4 }}>{n}</span>
                    </div>
                  ))}
                </div>
                <div style={{ paddingTop: 16, borderTop: `1px solid ${col.color}22`, fontSize: 12, fontWeight: 600, color: col.color, lineHeight: 1.5 }}>
                  {col.goal}
                </div>
              </div>
            ))}
          </div>

          {/* Transformation flow */}
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 24, padding: "32px 28px", marginBottom: 32 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.4)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>Der Weg der Veränderung</div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", margin: 0, fontStyle: "italic" }}>Gilt für Pferd, Mensch und Business gleichzeitig.</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                { n: "1", label: "Bewusstsein",  desc: "Ich sehe es" },
                { n: "2", label: "Verstehen",    desc: "Ich begreife es" },
                { n: "3", label: "Entscheiden",  desc: "Ich will es ändern" },
                { n: "4", label: "Handeln",      desc: "Ich tue es" },
                { n: "5", label: "Wachsen",      desc: "Es wird Teil von mir" },
              ].map((step, i, arr) => (
                <>
                  <div key={step.n} style={{ textAlign: "center", minWidth: 90 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `rgba(249,115,22,${0.15 + i * 0.15})`, border: `1px solid rgba(249,115,22,${0.3 + i * 0.14})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 13, fontWeight: 800, color: ORANGE }}>{step.n}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#FFF", marginBottom: 2 }}>{step.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{step.desc}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div key={`arr-${i}`} style={{ color: "rgba(249,115,22,.4)", fontSize: 18, flexShrink: 0, marginBottom: 20 }}>→</div>
                  )}
                </>
              ))}
            </div>
          </div>

          {/* Ikigai center */}
          <div style={{ background: "linear-gradient(135deg,rgba(249,115,22,.08),rgba(249,115,22,.04))", border: `1px solid rgba(249,115,22,.3)`, borderRadius: 24, padding: "36px 28px", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: ORANGE, marginBottom: 16 }}>Der Schnittpunkt — Ikigai</div>
            <h3 style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: "clamp(20px,3.5vw,32px)", fontStyle: "italic", color: "#FFF", lineHeight: 1.45, margin: "0 0 16px", fontWeight: 400 }}>
              Was das Pferd braucht. Was der Mensch liebt.<br />Was die Welt braucht. Was trägt.
            </h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.5)", margin: "0 0 6px", lineHeight: 1.7 }}>
              Hufi entsteht genau dort, wo diese vier Dinge sich treffen.
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.3)", margin: 0, fontStyle: "italic" }}>
              Nicht als Technologie-Produkt. Als Antwort auf eine echte Frage.
            </p>
          </div>
        </div>
      </section>

      {/* ── ÖKOSYSTEM ── */}
      <section id="ecosystem" className="sec">
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <SectionTitle sub="Das Pferd im Mittelpunkt. Alle verbunden.">
            Ein Pferd. Viele Menschen. Ein System.
          </SectionTitle>

          {/* Center: Pferd + Hufi */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div style={{ background: "rgba(249,115,22,.1)", border: `2px solid ${ORANGE}`, borderRadius: 28, padding: "28px 40px", textAlign: "center", maxWidth: 300 }}>
              <div style={{ fontSize: 52, marginBottom: 6 }}>🐴</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#FFF", letterSpacing: ".08em", marginBottom: 2 }}>DAS PFERD</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>im Mittelpunkt von allem</div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(249,115,22,.25)" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 4 }}>verbunden durch</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: ORANGE, letterSpacing: ".08em" }}>HUFI</div>
              </div>
            </div>
          </div>

          {/* Connector */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, maxWidth: 680, margin: "0 auto 20px" }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,rgba(249,115,22,.35))" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontWeight: 700, letterSpacing: ".1em", flexShrink: 0 }}>VERBINDET</span>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(249,115,22,.35),transparent)" }} />
          </div>

          {/* Roles */}
          <div className="eco-roles" style={{ marginBottom: 44 }}>
            {[
              { icon: "🔧", title: "Hufpfleger & Hufschmiede",     desc: "Termine, Touren, Befunde, Rechnungen. KI dokumentiert mit.",         color: ORANGE     },
              { icon: "🐎", title: "Pferdebesitzer",                desc: "Digitale Pferdeakte, Befunde, Dienstleister — kostenlos.",            color: "#10B981"  },
              { icon: "👥", title: "Tierärzte & Therapeuten",       desc: "Befunde einsehen, Diagnosen ergänzen — mit Freigabe.",               color: "#3B82F6"  },
              { icon: "🏢", title: "Stallbetreiber & Teams",        desc: "Alle Pferde, alle Dienstleister, ein Dashboard.",                    color: "#8B5CF6"  },
            ].map(c => (
              <div key={c.title} onClick={() => navigate("/auth")} style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${c.color}33`, borderRadius: 18, padding: "22px 18px", cursor: "pointer", transition: "all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.color}66`; e.currentTarget.style.background = "rgba(255,255,255,.07)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${c.color}33`; e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
              >
                <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#FFF", marginBottom: 6, lineHeight: 1.3 }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.6 }}>{c.desc}</div>
                <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: c.color }}>Mehr erfahren →</div>
              </div>
            ))}
          </div>

          {/* Jede Rolle verbunden */}
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", fontStyle: "italic" }}>
              Jede Rolle verbunden mit jeder — für lückenlose Kommunikation rund ums Pferd.
            </p>
          </div>

          {/* Datenhoheit */}
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 24, padding: "32px 28px" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#FFF", marginBottom: 6 }}>🛡️ Du entscheidest. Immer.</div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", margin: 0 }}>
                Der Pferdebesitzer hat vollständige Datenhoheit über sein Pferd.
              </p>
            </div>
            <div className="data-checks">
              {[
                "Kein Hufpfleger sieht dein Pferd ohne deine Erlaubnis",
                "Kein Tierarzt, kein Therapeut — niemand ohne dein Ja",
                "Du siehst jederzeit wer Zugriff hat",
                "Du kannst jeden Zugriff sofort entziehen",
                "Du bestimmst welche Daten geteilt werden",
                "Deine Daten bleiben auf deutschen Servern",
              ].map(item => (
                <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#10B981", fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.55 }}>{item}</span>
                </div>
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.25)", margin: "24px 0 0", fontStyle: "italic" }}>
              Das ist kein Versprechen — das ist technisch so gebaut.
            </p>
          </div>
        </div>
      </section>

      {/* ── WAS IST HUFI ── */}
      <section id="was-ist-hufi" className="sec">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <SectionTitle sub="Alles was du liebst — jetzt mit KI-Superkräften.">
            Bewährt. Intelligent. Vollständig.
          </SectionTitle>

          <div className="grid-features">
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 22, padding: "28px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 22 }}>✅</span>
                <h3 style={{ color: "#10B981", fontWeight: 700, fontSize: 14, margin: 0, letterSpacing: ".04em", textTransform: "uppercase" }}>Das bewährte Fundament</h3>
              </div>
              {["Terminkalender & Tourenplanung","Kunden & Pferdeverwaltung","Rechnungen & Buchhaltung","Pferdeakte & Befunde","Mitarbeiter & Rollen","DSGVO-konform, EU-Server","PWA (App ohne App Store)","Offline-Modus"].map(i => <Check key={i} label={i} />)}
            </div>

            <div style={{ background: "rgba(249,115,22,.05)", border: "1px solid rgba(249,115,22,.2)", borderRadius: 22, padding: "28px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 22 }}>🆕</span>
                <h3 style={{ color: ORANGE, fontWeight: 700, fontSize: 14, margin: 0, letterSpacing: ".04em", textTransform: "uppercase" }}>Neu bei Hufi</h3>
              </div>
              {["Hufi KI-Assistent (proaktiv)","'Hey Hufi' Sprachsteuerung","AutoFlow — Sprache wird Befund","HufCam Pro — KI-Hufanalyse","Hufi Brain — lernt deinen Betrieb","Intent Detection (erkennt was du willst)","Dienstleister-Suche per KI","DSGVO + EU AI Act konform"].map(i => <Check key={i} label={i} />)}
            </div>

            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 22, padding: "28px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>🐴</span>
                <h3 style={{ color: "#FFF", fontWeight: 700, fontSize: 14, margin: 0, letterSpacing: ".04em", textTransform: "uppercase" }}>Für Pferdebesitzer</h3>
              </div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ background: "#10B981", color: "#FFF", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 10px" }}>NEU · Kostenlos</span>
              </div>
              {["Digitale Pferdeakte","Befunde vom Hufpfleger sehen","Dienstleister finden & kontaktieren","Termine einsehen","Dokumente & Impfpass"].map(i => <Check key={i} label={i} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ── PREISE ── */}
      <section className="sec">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <SectionTitle sub="Dein bestehendes Abo läuft unverändert weiter — mit mehr Leistung.">
            Gleiche Preise. Mehr Leistung.
          </SectionTitle>

          <div className="grid-pricing">
            {([
              { name: "STARTER", price: "9,90€", period: "/Monat", sub: "1–10 Pferde · 1 Nutzer", highlight: false, badge: null,
                features: [{l:"Alle 5 Workflow-Stufen",y:true},{l:"Offline-Modus & PWA",y:true},{l:"DSGVO-konform",y:true},{l:"Kunden-App kostenlos",y:true},{l:"1. Hilfe Kunden Center",y:true},{l:"50 Hufi KI-Antworten/Monat",y:true},{l:"Hufi Connect & Netzwerk",y:false},{l:"KI-Features & AutoFlow",y:false},{l:"Vorlagen & PDF/Export",y:false}] },
              { name: "PRO",     price: "29,00€", period: "/Monat", sub: "11–75 Pferde · 1 Nutzer",   highlight: true,  badge: "BELIEBT",
                features: [{l:"Alle 5 Workflow-Stufen",y:true},{l:"Hufi Connect & Netzwerk",y:true},{l:"KI-Features & AutoFlow",y:true},{l:"Vorlagen & PDF/Export",y:true},{l:"Prioritäts-Support",y:true},{l:"Offline-Modus & PWA",y:true},{l:"DSGVO-konform",y:true},{l:"500 Hufi KI-Antworten/Monat",y:true},{l:"1. Hilfe Kunden Center",y:true}] },
              { name: "DUO",    price: "49,00€", period: "/Monat", sub: "76–150 Pferde · 2 Nutzer",  highlight: false, badge: null,
                features: [{l:"Alles aus Pro",y:true},{l:"2. Benutzer inklusive",y:true},{l:"Gemeinsame Doku & Notizen",y:true},{l:"Geteilte Kalender",y:true},{l:"2.000 Hufi KI-Antworten/Monat",y:true},{l:"1. Hilfe Kunden Center",y:true}] },
              { name: "TEAM",   price: "79,00€", period: "/Monat", sub: "151+ Pferde · Unbegrenzt",   highlight: false, badge: null,
                features: [{l:"Alles aus Duo",y:true},{l:"Unbegrenzte Nutzer",y:true},{l:"Rollen & Berechtigungen",y:true},{l:"Team-Auswertungen",y:true},{l:"Mitarbeiter-Verwaltung",y:true},{l:"Unlimitierte KI-Antworten",y:true},{l:"1. Hilfe Kunden Center",y:true}] },
            ] as const).map(plan => (
              <div key={plan.name} style={{ background: plan.highlight ? "rgba(249,115,22,.08)" : "rgba(255,255,255,.04)", border: plan.highlight ? `2px solid ${ORANGE}` : "1px solid rgba(255,255,255,.09)", borderRadius: 24, padding: "28px 22px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
                {plan.badge && <div style={{ position: "absolute", top: 16, right: 16, background: ORANGE, color: "#FFF", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 10px", letterSpacing: ".06em" }}>⭐ {plan.badge}</div>}
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: plan.highlight ? ORANGE : "rgba(255,255,255,.4)", marginBottom: 10 }}>{plan.name}</div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: plan.highlight ? ORANGE : "#FFF" }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginLeft: 3 }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,.06)" }}>{plan.sub}</div>
                <div style={{ flex: 1, marginBottom: 20 }}>
                  {plan.features.map(f => <Check key={f.l} label={f.l} yes={f.y} />)}
                </div>
                <Btn variant={plan.highlight ? "primary" : "secondary"} fullWidth onClick={() => navigate("/auth")}>Jetzt starten</Btn>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 20, padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#10B981", marginBottom: 8 }}>PFERDEBESITZER — KOSTENLOS</div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,.7)", marginBottom: 4 }}>Pferdeakte · Termine · Dienstleister</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Immer kostenlos. Keine Kreditkarte.</div>
            </div>
            <Btn variant="secondary" onClick={() => navigate("/auth")}>Kostenlos registrieren</Btn>
          </div>

          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.5)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 18 }}>💳 KI CREDITS ADD-ON — für alle Pläne</div>
            <div className="ki-credits-row">
              {[{p:"5€",c:"500 Antworten",b:""},{p:"10€",c:"1.100 Antworten",b:"+10% Bonus"},{p:"25€",c:"3.000 Antworten",b:"+20% Bonus"}].map(pkg => (
                <div key={pkg.p} style={{ background: "rgba(249,115,22,.07)", border: "1px solid rgba(249,115,22,.18)", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: ORANGE }}>{pkg.p}</span>
                  <div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>{pkg.c}</div>
                    {pkg.b && <div style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>{pkg.b}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>✓ Verfällt nie</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>🔒 Sicher via Stripe</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>⚡ Sofort verfügbar</span>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.2)", marginTop: 20, fontStyle: "italic" }}>
            14 Tage kostenlos · Keine Kreditkarte · Kündigung per E-Mail jederzeit · § 19 UStG — keine Mehrwertsteuer
          </p>
        </div>
      </section>

      {/* ── GRÜNDER ── */}
      <section className="sec">
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <SectionTitle sub="Der Mensch hinter Hufi.">
            Gebaut von jemandem der die Branche liebt
          </SectionTitle>

          <div className="founder-layout">
            <div style={{ flex: 1 }}>
              <div style={{ borderLeft: `3px solid ${ORANGE}`, paddingLeft: 22 }}>
                {[
                  { t: "Ich bin seit fast 20 Jahren in der Pferdebranche — persönlich, privat und beruflich.", bold: false },
                  { t: "Nicht als Theoretiker von außen. Sondern mittendrin.", bold: false },
                  { t: "Von der Geburt eines Fohlens bis zur Regenbogenbrücke jedes Pferdes.", bold: false },
                  { t: "Ich habe nicht den Tunnelblick eines Spezialisten — ich habe das breite Wissen von jemandem der die ganze Branche kennt.", bold: false },
                  { t: "Und ich bin nicht müde. Nicht ausgebrannt. Vielleicht körperlich manchmal — aber nicht im Herzen und nicht im Bewusstsein.", bold: false },
                  { t: "Ich fange erst jetzt richtig an zu brennen.", bold: true },
                  { t: "Was ich tue, tue ich seit über 10 Jahren aus tiefer Dankbarkeit gegenüber dieser Branche und den Menschen und Pferden darin.", bold: false },
                  { t: "Hufi ist kein Startup-Produkt das von außen in eine Welt reingrätscht.", bold: false },
                  { t: "Es ist das was diese Branche verdient hat — gebaut von jemandem der sie liebt.", bold: false },
                ].map((p, i) => (
                  <p key={i} style={{ fontSize: p.bold ? 17 : 14, fontWeight: p.bold ? 700 : 400, color: p.bold ? "#FFF" : "rgba(255,255,255,.65)", lineHeight: 1.8, margin: "0 0 12px" }}>{p.t}</p>
                ))}
              </div>
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#FFF" }}>Pascal Schmid</div>
                <div style={{ fontSize: 13, color: ORANGE, fontWeight: 600, marginTop: 3 }}>Gründer Hufi · Hufbearbeiter & Barhufexperte</div>
              </div>
            </div>

            <div className="founder-photo">
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", inset: "-20px", background: "radial-gradient(circle,rgba(249,115,22,.25) 0%,transparent 70%)", borderRadius: "50%", zIndex: 0, pointerEvents: "none" }} />
                <img src={pascalImage} alt="Pascal Schmid" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 20, position: "relative", zIndex: 1, border: "1px solid rgba(249,115,22,.2)" }} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 52, padding: "32px 28px", background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.2)", borderRadius: 20, textAlign: "center" }}>
            <p style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: "clamp(17px,3vw,25px)", fontStyle: "italic", color: "rgba(255,255,255,.85)", lineHeight: 1.65, margin: "0 0 16px" }}>
              "Pferde können nicht sprechen. Aber wir können ihnen eine Stimme geben — die sie sich nach über 5.500 Jahren an unserer Seite verdient haben."
            </p>
            <div style={{ fontSize: 13, color: ORANGE, fontWeight: 600 }}>— Pascal Schmid</div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="sec">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <SectionTitle sub="Was Pferdeprofis sagen.">
            Stimmen aus der Praxis
          </SectionTitle>

          <div className="testimonial-grid">
            {[
              { q: "Endlich alles an einem Ort. Die Tourenplanung spart mir jeden Tag mindestens 30 Minuten.", n: "Heiko W.",    r: "Hufpfleger · Norddeutschland" },
              { q: "Meine Kunden lieben die App. Die bekommen jetzt automatisch Updates — ich spar mir 20 WhatsApp-Nachrichten am Tag.", n: "Sandra M.", r: "Pferdeosteopathin · Bayern" },
              { q: "Rechnungen in 2 Klicks statt Excel-Chaos. Allein dafür lohnt sich Hufi.", n: "Tim K.", r: "Hufschmied · NRW" },
            ].map(t => (
              <div key={t.n} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ fontSize: 22, color: ORANGE, lineHeight: 1 }}>"</div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.65)", lineHeight: 1.75, fontStyle: "italic", margin: 0, flex: 1 }}>{t.q}</p>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#FFF" }}>{t.n}</div>
                  <div style={{ fontSize: 12, color: ORANGE, marginTop: 3 }}>{t.r}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="sec">
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Bebas Neue','Arial Black',sans-serif", fontSize: "clamp(42px,8vw,78px)", fontWeight: 400, color: "#FFF", margin: "0 0 16px", letterSpacing: ".02em", lineHeight: 1 }}>
            Bereit für Hufi?
          </h2>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 16, marginBottom: 40, fontStyle: "italic" }}>
            14 Tage kostenlos. Kein Risiko. Kein App Store. Kein Vertrag.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Btn onClick={() => navigate("/auth")}>Kostenlos starten</Btn>
            <Btn variant="ghost" onClick={() => navigate("/auth?force=login")}>Einloggen</Btn>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginTop: 32 }}>
            {["🔒 SSL","🇩🇪 EU-Server","✅ DSGVO","📱 PWA-App","§ 19 UStG"].map(b => (
              <span key={b} style={{ fontSize: 12, color: "rgba(255,255,255,.25)", fontWeight: 600 }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "44px 24px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: 30, height: 30, objectFit: "contain" }} />
            <span style={{ color: "#FFF", fontWeight: 800, fontSize: 20, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: ".04em" }}>Hufi</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.2)" }}>Entwickelt in Deutschland 🇩🇪 · DSGVO-konform · EU-Server</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
            {[{l:"Impressum",h:"/impressum"},{l:"Datenschutz",h:"/datenschutz"},{l:"AGB",h:"/agb"},{l:"Widerruf",h:"/widerruf"},{l:"Kontakt",h:"mailto:support@hufiapp.de"}].map(link => (
              <a key={link.l} href={link.h} style={{ color: "rgba(255,255,255,.3)", fontSize: 13, textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = ORANGE)}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.3)")}
              >{link.l}</a>
            ))}
          </div>
          <div style={{ color: "rgba(255,255,255,.18)", fontSize: 12 }}>© 2026 Hufi — Pascal Schmid, Kaiserslautern</div>
          <div style={{ color: "rgba(255,255,255,.13)", fontSize: 12 }}>Vom Stall für den Stall 🐴</div>
        </div>
      </footer>
    </div>
  );
}
