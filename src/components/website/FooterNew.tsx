import { Link } from "react-router-dom";
import { Shield, Server, Smartphone, Lock } from "lucide-react";
import logo from "@/assets/lp/hufmanager-logo.png";

const trustBadges = [
  { icon: Lock, label: "SSL" },
  { icon: Server, label: "EU-Server" },
  { icon: Shield, label: "DSGVO" },
  { icon: Smartphone, label: "PWA-App" },
];

const FooterNew = () => (
  <>
    {/* Trust Badges Bar */}
    <div className="py-6 bg-zinc-900/80 border-t border-white/5">
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {trustBadges.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-white/40 text-xs font-medium">
              <b.icon className="h-4 w-4 text-[#F5970A]/60" />
              {b.label}
            </div>
          ))}
          <span className="text-white/40 text-xs font-medium">§19 UStG</span>
        </div>
      </div>
    </div>

    {/* Footer */}
    <footer className="py-12 bg-zinc-900 border-t border-white/10">
      <div className="container">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* Brand */}
            <div className="space-y-3">
              <Link to="/" className="flex items-center gap-2">
                <img src={logo} alt="HufManager Logo" className="h-10 w-auto brightness-0 invert" />
              </Link>
              <p className="text-white/40 text-sm leading-relaxed">
                Entwickelt in Deutschland 🇩🇪
                <br />
                DSGVO-konform · EU-Server
              </p>
              <p className="text-[#F5970A] font-bold text-xs">#ZukunftHuf2030</p>
            </div>

            {/* Links */}
            <nav className="space-y-2">
              <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Rechtliches</p>
              <Link to="/impressum" className="block text-white/50 hover:text-white transition-colors text-sm">Impressum</Link>
              <Link to="/datenschutz" className="block text-white/50 hover:text-white transition-colors text-sm">Datenschutz</Link>
              <Link to="/agb" className="block text-white/50 hover:text-white transition-colors text-sm">AGB</Link>
              <Link to="/vertrauen" className="block text-white/50 hover:text-white transition-colors text-sm">Trust & Security</Link>
              <Link to="/widerruf" className="block text-white/50 hover:text-white transition-colors text-sm">Widerruf</Link>
            </nav>

            {/* Contact */}
            <div className="space-y-2">
              <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Kontakt</p>
              <a href="mailto:support@hufmanager.de" className="block text-white/50 hover:text-white transition-colors text-sm">
                support@hufmanager.de
              </a>
              <p className="text-white/40 text-xs mt-3 leading-relaxed">
                Pascal Schmid<br />
                c/o Postflex #10643<br />
                Emsdettener Str. 10<br />
                48268 Greven
              </p>
              <p className="text-white/30 text-[10px] mt-2 leading-relaxed">
                Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5 text-center">
            <p className="text-white/30 text-xs">
              © {new Date().getFullYear()} HufManager. Alle Rechte vorbehalten. Vom Stall für den Stall.
            </p>
          </div>
        </div>
      </div>
    </footer>
  </>
);

export default FooterNew;
