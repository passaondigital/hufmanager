import { useState } from "react";
import { Hammer, Heart, Users, Stethoscope, Building2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_EMAILS } from "@/lib/demo-accounts";
import { toast } from "sonner";

const DEMO_PASSWORD = "HufManagerDemo2030";
const BUSINESS_PASSWORD = "HMB2030+";

interface DemoAccount {
  label: string;
  email: string;
  icon: React.ElementType;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Hufbearbeiter",
    email: DEMO_EMAILS.provider,
    icon: Hammer,
    description: "Betrieb & Verwaltung",
  },
  {
    label: "Pferdebesitzer",
    email: DEMO_EMAILS.client,
    icon: Heart,
    description: "Pferdeakte & Termine",
  },
  {
    label: "Mitarbeiter",
    email: DEMO_EMAILS.employee,
    icon: Users,
    description: "Tour & Aufträge",
  },
  {
    label: "Fachpartner",
    email: DEMO_EMAILS.partner,
    icon: Stethoscope,
    description: "Tierarzt / Therapeut",
  },
];

interface DemoAccessCardsProps {
  onSelectAccount: (email: string, password: string) => void;
}

export function DemoAccessCards({ onSelectAccount }: DemoAccessCardsProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyEmail = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast.success("E-Mail kopiert");
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="mt-6 max-w-md w-full">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        <span className="font-medium">1-Click Demo – 4 Perspektiven entdecken</span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 mt-2 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              const isCopied = copiedEmail === account.email;

              return (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => onSelectAccount(account.email, DEMO_PASSWORD)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border",
                    "bg-card hover:bg-muted/50 hover:border-primary/40 transition-all duration-200",
                    "text-center group cursor-pointer"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">{account.label}</span>
                  <span className="text-[10px] text-muted-foreground">{account.description}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-muted-foreground/70 truncate max-w-[120px]">
                      {account.email.split("@")[0]}
                    </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleCopyEmail(account.email, e)}
                    className="text-muted-foreground/50 hover:text-primary transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <Check className="h-2.5 w-2.5 text-green-500" />
                    ) : (
                      <Copy className="h-2.5 w-2.5" />
                    )}
                  </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Business Portal Card */}
          <div className="border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground text-center mb-2 font-medium">Für Unternehmen & Organisationen</p>
            <button
              type="button"
              onClick={() => onSelectAccount(DEMO_EMAILS.business, BUSINESS_PASSWORD)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border border-border",
                "bg-card hover:bg-muted/50 hover:border-primary/40 transition-all duration-200",
                "text-left group cursor-pointer"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-foreground block">HufManager Business Portal</span>
                <span className="text-[10px] text-muted-foreground block">
                  Versicherungen · Hersteller · Verbände · Kliniken · Ausbildung · Lieferanten
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] text-muted-foreground/70 truncate max-w-[100px] hidden sm:inline">
                  {DEMO_EMAILS.business.split("@")[0]}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyEmail(DEMO_EMAILS.business, e)}
                  className="text-muted-foreground/50 hover:text-primary transition-colors"
                >
                  {copiedEmail === DEMO_EMAILS.business ? (
                    <Check className="h-2.5 w-2.5 text-green-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </button>
              </div>
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center mt-1">
            Klick = Auto-Login · Entdecke auch die <span className="text-primary font-medium">3 AutoFlow-Modi</span>
          </p>
        </div>
      )}
    </div>
  );
}
