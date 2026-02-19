import { Link } from "react-router-dom";
import logo from "@/assets/lp/hufmanager-logo.png";

const FooterNew = () => (
  <footer className="py-12 bg-zinc-900 border-t border-white/10">
    <div className="container">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="HufManager Logo" className="h-12 w-auto brightness-0 invert" />
        </Link>
        <nav className="flex items-center gap-8">
          <Link to="/impressum" className="text-white/50 hover:text-white transition-colors text-sm">Impressum</Link>
          <Link to="/datenschutz" className="text-white/50 hover:text-white transition-colors text-sm">Datenschutz</Link>
          <Link to="/agb" className="text-white/50 hover:text-white transition-colors text-sm">AGB</Link>
        </nav>
        <p className="text-white/40 text-sm">© {new Date().getFullYear()} HufManager. Alle Rechte vorbehalten.</p>
      </div>
    </div>
  </footer>
);

export default FooterNew;
