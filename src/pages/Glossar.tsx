import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Search,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
  Users,
  Map,
  FileText,
  Camera,
  Euro,
  MessageSquare,
  Bell,
  Clock,
  Megaphone,
  UserCheck,
  Briefcase,
  FileCheck,
  Globe,
  Star,
  Shield,
  Sparkles,
  Download,
  HelpCircle,
  Lock,
  Home,
  MapPin,
  CreditCard,
  Smartphone,
  LayoutDashboard,
  Mail,
  Bot,
  Video,
  Tag,
  Receipt,
} from "lucide-react";

interface GlossaryEntry {
  id: string;
  term: string;
  description: string;
  category: string;
  icon: string | null;
  tags: string[];
  related_terms: string[];
  sort_order: number;
}

// Map icon names to Lucide components
const iconMap: Record<string, any> = {
  LayoutDashboard, Calendar, Map, Users, Camera, Video, FileText, Euro, Tag,
  Download, MessageSquare, Bell, Clock, Megaphone, UserCheck, Briefcase,
  FileCheck, Globe, Search, Star, Bot, Mail, Smartphone, Shield, Sparkles,
  HelpCircle, Lock, Home, MapPin, CreditCard, BookOpen, Receipt,
  Horse: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11a2 2 0 1 0 4 0 2 2 0 1 0-4 0" />
      <path d="M13 3.5c3-2 6.5 0 8.5 3s2 8-1.5 11.5" />
      <path d="m5 19 2-2" />
      <path d="m18 11-3.5 4" />
      <path d="M6.5 19.5 3 16l5-5" />
      <path d="M7.5 7.5 8 4l4 .5" />
    </svg>
  ),
};

const categoryColors: Record<string, string> = {
  Kernfunktionen: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Dokumentation: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Finanzen: "bg-green-500/10 text-green-700 dark:text-green-400",
  Kommunikation: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  Team: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  Marketing: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  Schnittstellen: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  Technik: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  "Kunden-Portal": "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  Administration: "bg-red-500/10 text-red-700 dark:text-red-400",
  Rechtliches: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
};

export default function Glossar() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["glossary-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glossary_entries")
        .select("id, term, description, category, icon, tags, related_terms, sort_order")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as GlossaryEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const categories = useMemo(() => {
    const cats = [...new Set(entries.map((e) => e.category))];
    return cats.sort();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchSearch =
        !search ||
        e.term.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchCat = !activeCategory || e.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [entries, search, activeCategory]);

  const grouped = useMemo(() => {
    const map: Record<string, GlossaryEntry[]> = {};
    filtered.forEach((e) => {
      if (!map[e.category]) map[e.category] = [];
      map[e.category].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const renderIcon = (iconName: string | null) => {
    if (!iconName) return <BookOpen className="h-5 w-5" />;
    const IconComp = iconMap[iconName];
    if (!IconComp) return <BookOpen className="h-5 w-5" />;
    return <IconComp className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                HufManager Glossar
              </h1>
              <p className="text-sm text-muted-foreground">
                {entries.length} Funktionen & Begriffe • {categories.length} Kategorien
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Funktionen, Begriffen oder Tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category filters */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-4 px-4">
            <Button
              variant={activeCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(null)}
              className="shrink-0"
            >
              Alle
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className="shrink-0"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Keine Einträge gefunden</p>
            <p className="text-sm mt-1">Versuche einen anderen Suchbegriff</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([category, items]) => (
              <section key={category}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium ${categoryColors[category] || "bg-muted text-muted-foreground"}`}>
                    {category}
                  </span>
                  <span className="text-sm text-muted-foreground font-normal">({items.length})</span>
                </h2>
                <div className="grid gap-3">
                  {items.map((entry) => {
                    const isExpanded = expandedId === entry.id;
                    return (
                      <Card
                        key={entry.id}
                        className="cursor-pointer hover:shadow-md transition-all"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${categoryColors[entry.category]?.split(" ")[0] || "bg-muted"}`}>
                              {renderIcon(entry.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground">{entry.term}</h3>
                                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                              </div>
                              <p className={`text-sm text-muted-foreground mt-1 ${isExpanded ? "" : "line-clamp-2"}`}>
                                {entry.description}
                              </p>

                              {isExpanded && (
                                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                  {entry.tags?.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Tags:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {entry.tags.map((tag) => (
                                          <Badge key={tag} variant="secondary" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {entry.related_terms?.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Verwandte Funktionen:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {entry.related_terms.map((rt) => (
                                          <Badge
                                            key={rt}
                                            variant="outline"
                                            className="text-xs cursor-pointer hover:bg-primary/10"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSearch(rt);
                                              setActiveCategory(null);
                                            }}
                                          >
                                            {rt} →
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
