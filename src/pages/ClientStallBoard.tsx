import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MessageSquare, Plus, Send } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";


interface StallPost {
  id: string;
  display_name: string;
  category: string;
  text: string;
  photo_url: string | null;
  created_at: string;
  author_id: string;
}

const CATEGORIES = [
  { value: "info", emoji: "📢", label: "Info" },
  { value: "angebot", emoji: "🤝", label: "Angebot" },
  { value: "frage", emoji: "❓", label: "Frage" },
  { value: "event", emoji: "🎉", label: "Event" },
];

export default function ClientStallBoard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<StallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState("info");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const init = async () => {
      // Get connected provider
      const { data: grant } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!grant) {
        setLoading(false);
        return;
      }

      setProviderId(grant.provider_id);

      // Get display name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setDisplayName(profile?.full_name || "Anonym");

      // Fetch posts
      const { data: postsData } = await supabase
        .from("stall_board_posts")
        .select("*")
        .eq("provider_id", grant.provider_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      setPosts((postsData as StallPost[]) || []);
      setLoading(false);
    };

    init();
  }, [user]);

  const handlePost = async () => {
    if (!user || !providerId || !text.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("stall_board_posts").insert({
      provider_id: providerId,
      author_id: user.id,
      display_name: displayName,
      category,
      text: text.trim(),
    });

    if (error) {
      toast.error("Fehler beim Posten");
    } else {
      toast.success("Beitrag veröffentlicht! 📢");
      setText("");
      setShowForm(false);
      // Refetch
      const { data } = await supabase
        .from("stall_board_posts")
        .select("*")
        .eq("provider_id", providerId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      setPosts((data as StallPost[]) || []);
    }
    setSaving(false);
  };

  const getCategoryInfo = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat) || CATEGORIES[0];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background to-muted/20">
      <header
        className="sticky top-0 z-20 bg-background/70 backdrop-blur-xl border-b border-border/50"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)" }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client-home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg flex items-center gap-2">Stallboard <HelpTip id="kunden.stallboard" /></h1>
          <Button
            size="sm"
            className="ml-auto gap-1"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Beitrag
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4 pb-safe" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
        {/* New post form */}
        {showForm && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2 overflow-x-auto">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={category === cat.value ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => setCategory(cat.value)}
                  >
                    {cat.emoji} {cat.label}
                  </Button>
                ))}
              </div>
              <Textarea
                placeholder="Was möchtest du teilen?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="text-base"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                  Abbrechen
                </Button>
                <Button className="flex-1 gap-1" onClick={handlePost} disabled={saving || !text.trim()}>
                  <Send className="h-4 w-4" />
                  {saving ? "Posten..." : "Posten"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 text-muted-foreground">Laden...</div>
        )}

        {/* No provider */}
        {!loading && !providerId && (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Du brauchst einen verbundenen Hufpfleger, um das Stallboard nutzen zu können.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty */}
        {!loading && providerId && posts.length === 0 && !showForm && (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">Noch keine Beiträge</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sei der Erste, der etwas im Stall teilt!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Posts */}
        {posts.map((post) => {
          const catInfo = getCategoryInfo(post.category);
          return (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {post.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {post.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(post.created_at), "dd. MMM, HH:mm", { locale: de })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                    {catInfo.emoji} {catInfo.label}
                  </Badge>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{post.text}</p>
              </CardContent>
            </Card>
          );
        })}
      </main>

      <ClientBottomNav />
    </div>
  );
}
