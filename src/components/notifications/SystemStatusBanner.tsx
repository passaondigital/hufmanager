import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, XCircle, Info, X } from "lucide-react";

export function SystemStatusBanner() {
  const [messages, setMessages] = useState<Array<{
    id: string;
    title: string;
    message: string;
    severity: string;
  }>>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("system_status_messages")
        .select("id, title, message, severity")
        .eq("is_active", true)
        .eq("show_banner", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (data) setMessages(data);
    };

    fetchMessages();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMessages, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const visibleMessages = messages.filter((m) => !dismissed.has(m.id));

  if (visibleMessages.length === 0) return null;

  return (
    <div className="space-y-0">
      {visibleMessages.map((msg) => (
        <div
          key={msg.id}
          className={`px-4 py-2 flex items-center justify-between text-sm ${
            msg.severity === "critical"
              ? "bg-red-500 text-white"
              : msg.severity === "warning"
                ? "bg-amber-500 text-black"
                : "bg-blue-500 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.severity === "critical" ? <XCircle className="h-4 w-4" /> :
             msg.severity === "warning" ? <AlertTriangle className="h-4 w-4" /> :
             <Info className="h-4 w-4" />}
            <span className="font-medium">{msg.title}:</span>
            <span>{msg.message}</span>
          </div>
          <button
            onClick={() => setDismissed((s) => new Set(s).add(msg.id))}
            className="p-1 hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
