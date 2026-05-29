import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const LAUNCH_DATE = new Date("2026-04-01T00:00:00");
const DISMISS_KEY = "hm_botschafter_dismissed";
const SESSION_KEY = "hm_botschafter_reminder_shown";
const COOLDOWN_KEY = "hm_botschafter_reminder_cooldown";
const COOLDOWN_DAYS = 3;

function getDaysUntilLaunch(): number {
  const now = new Date();
  const diff = LAUNCH_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getTargetRoute(role: string | null): string {
  switch (role) {
    case "partner": return "/partner-management/botschafter";
    case "employee": return "/employee/management/botschafter";
    case "client": return "/client/botschafter";
    default: return "/management/botschafter";
  }
}

export function BotschafterReminder() {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const [showJoinTooltip, setShowJoinTooltip] = useState(false);
  const checkedRef = useRef(false);

  // Swipe state
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id || checkedRef.current) return;
    checkedRef.current = true;

    if (new Date() >= LAUNCH_DATE) return;
    const path = location.pathname;
    if (path.startsWith("/botschafter") || path.startsWith("/pferdeakte")) return;
    if (localStorage.getItem(DISMISS_KEY) === "true") return;
    if (sessionStorage.getItem(SESSION_KEY) === "true") return;
    const cooldownUntil = localStorage.getItem(COOLDOWN_KEY);
    if (cooldownUntil && Date.now() < Number(cooldownUntil)) return;

    supabase
      .from("pferdeakte_botschafter")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) return;
        setVisible(true);
        requestAnimationFrame(() => setAnimateIn(true));
      });
  }, [user?.id, location.pathname]);

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/botschafter") || path.startsWith("/pferdeakte")) {
      setVisible(false);
    }
  }, [location.pathname]);

  const handleClose = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "true");
    const cooldownUntil = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(COOLDOWN_KEY, String(cooldownUntil));
    setAnimateOut(true);
    setTimeout(() => setVisible(false), 300);
  }, []);

  const handleDismissPermanent = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "true");
    setAnimateOut(true);
    setTimeout(() => setVisible(false), 300);
  }, []);

  const handleJoin = useCallback(() => {
    setShowJoinTooltip(true);
    setTimeout(() => {
      setShowJoinTooltip(false);
      navigate(getTargetRoute(role));
    }, 1500);
  }, [navigate, role]);

  // Touch handlers for swipe-to-dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    // Only allow downward swipe (positive delta = swipe down to dismiss)
    const clampedDelta = Math.max(0, delta);
    touchDeltaY.current = clampedDelta;
    setSwipeOffset(clampedDelta);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDeltaY.current > 80) {
      // Swiped far enough — dismiss for session
      handleClose();
    }
    setSwipeOffset(0);
    touchDeltaY.current = 0;
  }, [handleClose]);

  if (!visible) return null;

  const daysLeft = getDaysUntilLaunch();

  return (
    <div
      ref={bannerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-out",
        animateIn && !animateOut ? "translate-y-0" : "translate-y-full"
      )}
      style={{
        background: "#0a0a0a",
        transform: animateIn && !animateOut && swipeOffset > 0
          ? `translateY(${swipeOffset}px)`
          : undefined,
        transition: swipeOffset > 0 ? "none" : undefined,
      }}
    >
      {/* Swipe indicator */}
      <div className="flex justify-center pt-2 pb-0 lg:hidden">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 lg:py-4 flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-6">
        {/* Left — Icon + Text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Megaphone className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-foreground font-bold text-[15px] leading-tight">
              🐴 Werde Hufi Botschafter — bis zu 50% Provision
            </p>
            <p className="text-muted-foreground text-[13px] mt-0.5 leading-snug">
              Empfehle Hufi und verdiene. Die Kunden-App ist kostenlos — du verdienst wenn Profis buchen.
            </p>
          </div>
        </div>

        {/* Center — Countdown */}
        <div className="hidden lg:block shrink-0">
          <span className="text-primary font-bold text-sm whitespace-nowrap">
            Noch {daysLeft} Tage bis Launch · 1. April 2026
          </span>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto">
          {/* Mobile countdown */}
          <span className="lg:hidden text-primary font-bold text-xs mr-auto">
            Noch {daysLeft} Tage
          </span>

          <div className="relative">
            <Button
              size="sm"
              onClick={handleJoin}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full gap-1.5 h-9 px-4 text-xs font-semibold"
            >
              🎙️ Jetzt mitmachen
            </Button>
            {showJoinTooltip && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 rounded-lg bg-card text-foreground text-xs p-3 shadow-lg border border-border z-50 text-center">
                Du findest das Botschafter-Programm immer unter Management → Botschafter werden 🎙️
              </div>
            )}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted/10 h-9 px-3 text-xs"
              >
                Kein Interesse
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="w-72 p-4 bg-card border-border"
            >
              <p className="text-sm text-foreground mb-3">
                Sicher? Du kannst dich später jederzeit noch als Botschafter registrieren.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismissPermanent}
                  className="flex-1 text-xs h-9"
                >
                  Ja, dauerhaft ausblenden
                </Button>
                <Button
                  size="sm"
                  onClick={handleJoin}
                  className="flex-1 text-xs h-9"
                >
                  Doch, mitmachen!
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook to check if the reminder banner is visible — for conditional padding */
export function useBotschafterReminderVisible(): boolean {
  const { user } = useAuth();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || checkedRef.current) return;
    checkedRef.current = true;

    if (new Date() >= LAUNCH_DATE) return;
    const path = location.pathname;
    if (path.startsWith("/botschafter") || path.startsWith("/pferdeakte")) return;
    if (localStorage.getItem(DISMISS_KEY) === "true") return;
    if (sessionStorage.getItem(SESSION_KEY) === "true") return;
    const cooldownUntil = localStorage.getItem(COOLDOWN_KEY);
    if (cooldownUntil && Date.now() < Number(cooldownUntil)) return;

    supabase
      .from("pferdeakte_botschafter")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setVisible(true);
      });
  }, [user?.id, location.pathname]);

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/botschafter") || path.startsWith("/pferdeakte")) {
      setVisible(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const check = () => {
      if (localStorage.getItem(DISMISS_KEY) === "true" || sessionStorage.getItem(SESSION_KEY) === "true") {
        setVisible(false);
      }
    };
    window.addEventListener("storage", check);
    const interval = setInterval(check, 1000);
    return () => {
      window.removeEventListener("storage", check);
      clearInterval(interval);
    };
  }, []);

  return visible;
}
