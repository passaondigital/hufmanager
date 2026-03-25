import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone } from "lucide-react";
import { WEBSITE_PAGE_TYPES } from "@/data/websitePageTypes";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  businessName: string;
  logoUrl?: string | null;
  primaryColor: string;
  activePages: string[];
  phone?: string | null;
  sticky?: boolean;
}

export const WebsiteNavbar = ({ slug, businessName, logoUrl, primaryColor, activePages, phone, sticky = true }: Props) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = WEBSITE_PAGE_TYPES
    .filter((p) => activePages.includes(p.id) && !["impressum", "datenschutz"].includes(p.id))
    .map((p) => ({
      label: p.label,
      href: p.id === "home" ? `/p/${slug}` : `/p/${slug}/${p.slug}`,
    }));

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className={cn("w-full z-50 bg-background/95 backdrop-blur-sm border-b", sticky && "sticky top-0")}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo / Name */}
        <Link to={`/p/${slug}`} className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>
              {businessName.charAt(0)}
            </div>
          )}
          <span className="font-bold text-foreground text-sm sm:text-base">{businessName}</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "px-3 py-2 text-sm rounded-md transition-colors",
                isActive(item.href) ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
              style={isActive(item.href) ? { color: primaryColor } : undefined}
            >
              {item.label}
            </Link>
          ))}
          <a
            href="#preisrechner"
            className="px-3 py-2 text-sm rounded-md transition-colors text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("preisrechner")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Preise
          </a>
          {phone && (
            <a href={`tel:${phone}`} className="ml-2">
              <Button size="sm" variant="outline" className="gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Anrufen
              </Button>
            </a>
          )}
        </nav>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t bg-background px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm rounded-md text-foreground hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
          {phone && (
            <a href={`tel:${phone}`} className="block px-3 py-2 text-sm text-primary font-medium">
              📞 {phone}
            </a>
          )}
        </nav>
      )}
    </header>
  );
};
