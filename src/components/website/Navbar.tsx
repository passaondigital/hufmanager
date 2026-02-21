import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/lp/hufmanager-logo.png";

const LANDING_HOSTS = ["www.hufmanager.de", "hufmanager.de"];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isLandingDomain = LANDING_HOSTS.includes(window.location.hostname);

  // On the landing page domain, login must go to app.hufmanager.de/auth
  // On preview/app domains, use internal SPA routing
  const loginHref = isLandingDomain ? "https://app.hufmanager.de/auth" : "/auth";

  const LoginLink = isLandingDomain 
    ? ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <a href={loginHref} className={className}>{children}</a>
      )
    : ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <Link to="/auth" className={className}>{children}</Link>
      );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <img src={logo} alt="HufManager Logo" className="h-[66px] w-auto" />
          </a>

          <nav className="hidden md:flex items-center gap-8">
            <a href="/#ecosystem" className="text-white/60 hover:text-white transition-colors text-sm font-medium">Plattform</a>
            <a href="/#pricing" className="text-white/60 hover:text-white transition-colors text-sm font-medium">Preise</a>
            <a href="/#hufrente" className="text-white/60 hover:text-white transition-colors text-sm font-medium">Über uns</a>
            <Link to="/blog" className="text-white/60 hover:text-white transition-colors text-sm font-medium">Blog</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" className="text-white hover:bg-white/10" asChild>
              <LoginLink>Login</LoginLink>
            </Button>
            <Button asChild>
              <a href="/#demo">Demo ansehen</a>
            </Button>
          </div>

          <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)} aria-label="Menu öffnen">
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <nav className="flex flex-col gap-4">
              <a href="/#ecosystem" className="text-white py-2" onClick={() => setIsOpen(false)}>Plattform</a>
              <a href="/#pricing" className="text-white py-2" onClick={() => setIsOpen(false)}>Preise</a>
              <a href="/#hufrente" className="text-white py-2" onClick={() => setIsOpen(false)}>Über uns</a>
              <Link to="/blog" className="text-white py-2">Blog</Link>
              <div className="flex flex-col gap-2 pt-4">
                <Button variant="ghost" className="w-full text-white" asChild>
                  <LoginLink>Login</LoginLink>
                </Button>
                <Button className="w-full" asChild>
                  <a href="/#demo" onClick={() => setIsOpen(false)}>Demo ansehen</a>
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
