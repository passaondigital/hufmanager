import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, BarChart3, Send, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AdminEmailAnalytics() {
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [targets, setTargets] = useState({ provider: true, partner: false, stall: false });

  // Fetch global stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-email-stats"],
    queryFn: async () => {
      const [listsRes, campaignsRes, subscribersRes] = await Promise.all([
        supabase.from("email_lists").select("id", { count: "exact", head: true }),
        supabase.from("email_campaigns").select("stats_sent, stats_opened").eq("status", "sent"),
        supabase.from("email_subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed"),
      ]);

      const totalSent = (campaignsRes.data || []).reduce((sum, c) => sum + (c.stats_sent || 0), 0);
      const totalOpened = (campaignsRes.data || []).reduce((sum, c) => sum + (c.stats_opened || 0), 0);
      const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

      return {
        activeLists: listsRes.count || 0,
        totalSent,
        activeSubscribers: subscribersRes.count || 0,
        avgOpenRate,
        campaigns: campaignsRes.data || [],
      };
    },
    staleTime: 60000,
  });

  const handleBroadcast = () => {
    if (!broadcastSubject.trim() || !broadcastContent.trim()) return toast.error("Betreff und Inhalt sind Pflicht");
    toast.success("System-Broadcast wird vorbereitet... (Coming Soon)");
    setBroadcastSubject("");
    setBroadcastContent("");
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-[#F47B20]" />
            <p className="text-3xl font-bold text-black">{stats?.activeLists || 0}</p>
            <p className="text-sm text-muted-foreground">Aktive E-Mail-Listen</p>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="pt-6 text-center">
            <Mail className="w-8 h-8 mx-auto mb-2 text-[#F47B20]" />
            <p className="text-3xl font-bold text-black">{stats?.totalSent || 0}</p>
            <p className="text-sm text-muted-foreground">Versendete E-Mails (Gesamt)</p>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="pt-6 text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-[#F47B20]" />
            <p className="text-3xl font-bold text-black">{stats?.avgOpenRate || 0}%</p>
            <p className="text-sm text-muted-foreground">Durchschn. Öffnungsrate</p>
          </CardContent>
        </Card>
      </div>

      {/* System Broadcast */}
      <Card className="bg-white rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-black flex items-center gap-2">
            <Send className="w-5 h-5 text-[#F47B20]" />
            System-Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sende wichtige Plattform-Updates an alle professionellen Nutzer gleichzeitig.
          </p>
          <div className="space-y-2">
            <Label className="text-black">Betreff</Label>
            <Input value={broadcastSubject} onChange={(e) => setBroadcastSubject(e.target.value)} placeholder="z.B. Wichtiges Plattform-Update" className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-black">Nachricht</Label>
            <Textarea value={broadcastContent} onChange={(e) => setBroadcastContent(e.target.value)} placeholder="Dein Update an alle Nutzer..." className="bg-white min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label className="text-black">Zielgruppen</Label>
            <div className="flex gap-4">
              {[
                { key: "provider", label: "Provider" },
                { key: "partner", label: "Partner" },
                { key: "stall", label: "Stallbetreiber" },
              ].map(t => (
                <div key={t.key} className="flex items-center gap-2">
                  <Checkbox
                    checked={targets[t.key as keyof typeof targets]}
                    onCheckedChange={(v) => setTargets(prev => ({ ...prev, [t.key]: !!v }))}
                  />
                  <span className="text-sm text-black">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
          <Button className="bg-[#F47B20] hover:bg-[#e06a10] text-white" onClick={handleBroadcast}>
            <Send className="w-4 h-4 mr-2" />
            Broadcast senden
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
