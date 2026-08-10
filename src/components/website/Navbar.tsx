import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/lp/hufi-logo.svg";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-bar bg-black/80 backdrop-blur-lg border-b border-white/10">
      <div className="w-full max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-16">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <img src={logo} alt="Hufi Logo" className="h-[66px] w-auto" />
          </a>

          <nav className="hidden md:flex items-center gap-8">
            <a href="/#heute" className="text-white/60 hover:text-white transition-colors text-sm font-medium">Plattform</a>
            <a href="/#fuer-wen" className="text-white/60 hover:text-white transition-colors text-sm font-medium">Für wen</a>
            <a href="/#pricing" className="text-white/60 hover:text-white transition-colors text-sm font-medium">Preise</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" className="text-white hover:bg-white/10" asChild>
              <Link to="/auth?force=login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Kostenlos starten</Link>
            </Button>
          </div>

          <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)} aria-label="Menu öffnen">
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <nav className="flex flex-col gap-4">
              <a href="/#heute" className="text-white py-2" onClick={() => setIsOpen(false)}>Plattform</a>
              <a href="/#fuer-wen" className="text-white py-2" onClick={() => setIsOpen(false)}>Für wen</a>
              <a href="/#pricing" className="text-white py-2" onClick={() => setIsOpen(false)}>Preise</a>
              <div className="flex flex-col gap-2 pt-4">
                <Button variant="ghost" className="w-full text-white" asChild>
                  <Link to="/auth?force=login">Login</Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>Kostenlos starten</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
