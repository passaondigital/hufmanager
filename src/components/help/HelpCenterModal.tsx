import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Book, Camera, DollarSign, Navigation, Sparkles, Users, Wifi, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HelpArticleView } from "./HelpArticleView";
import { cn } from "@/lib/utils";

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  role_access: "all" | "pid_only" | "kid_only";
  tags: string[];
  hook: string | null;
  solution_steps: string[] | null;
  call_to_action: string | null;
  is_featured: boolean;
}

interface HelpCenterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRoute?: string;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Book; label: string; emoji: string }> = {
  "Erste Schritte": { icon: Sparkles, label: "Start", emoji: "🚀" },
  "Workflow": { icon: Book, label: "Workflow", emoji: "📋" },
  "HufCam": { icon: Camera, label: "HufCam", emoji: "📸" },
  "Navigation": { icon: Navigation, label: "Tour", emoji: "🗺️" },
  "Finanzen": { icon: DollarSign, label: "Finanzen", emoji: "💰" },
  "Für Kunden": { icon: Users, label: "Kunden", emoji: "🐴" },
  "Allgemein": { icon: Wifi, label: "Allgemein", emoji: "📱" },
};

// Map routes to preferred categories
const ROUTE_CATEGORY_MAP: Record<string, string[]> = {
  "/aufnahme": ["Workflow", "Erste Schritte"],
  "/kunden": ["Workflow", "Für Kunden"],
  "/rechnungen": ["Finanzen"],
  "/analyse": ["Finanzen", "Workflow"],
  "/tour": ["Navigation"],
  "/work-mode": ["Navigation", "Erste Schritte"],
  "/hufanalyse": ["HufCam"],
  "/client-home": ["Für Kunden"],
  "/client-invoices": ["Für Kunden"],
};

export function HelpCenterModal({ open, onOpenChange, currentRoute }: HelpCenterModalProps) {
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedCategory(null);
      setSelectedArticle(null);
    }
  }, [open]);

  // Set preferred category based on current route
  useEffect(() => {
    if (open && currentRoute && !selectedCategory && !searchQuery) {
      const preferredCategories = ROUTE_CATEGORY_MAP[currentRoute];
      if (preferredCategories?.length) {
        setSelectedCategory(preferredCategories[0]);
      }
    }
  }, [open, currentRoute, selectedCategory, searchQuery]);

  // Fetch articles
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["help-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as HelpArticle[];
    },
    enabled: open,
  });

  // Filter articles based on role
  const roleFilteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (article.role_access === "all") return true;
      if (article.role_access === "pid_only" && (role === "provider" || role === "admin")) return true;
      if (article.role_access === "kid_only" && role === "client") return true;
      return false;
    });
  }, [articles, role]);

  // Search and category filter
  const filteredArticles = useMemo(() => {
    let result = roleFilteredArticles;

    // Category filter
    if (selectedCategory) {
      result = result.filter((a) => a.category === selectedCategory);
    }

    // Search filter
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.content.toLowerCase().includes(query) ||
          a.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [roleFilteredArticles, selectedCategory, debouncedQuery]);

  // Smart suggestions while typing
  const suggestions = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return roleFilteredArticles
      .filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.tags.some((tag) => tag.toLowerCase().includes(query))
      )
      .slice(0, 5);
  }, [searchQuery, roleFilteredArticles]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(roleFilteredArticles.map((a) => a.category));
    return Array.from(cats).filter((c) => CATEGORY_CONFIG[c]);
  }, [roleFilteredArticles]);

  // Featured articles
  const featuredArticles = useMemo(() => {
    return roleFilteredArticles.filter((a) => a.is_featured).slice(0, 3);
  }, [roleFilteredArticles]);

  if (selectedArticle) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          <HelpArticleView
            article={selectedArticle}
            onBack={() => setSelectedArticle(null)}
            isAdmin={role === "admin" || role === "provider"}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">🐴</span>
            Huf-Hilfe
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Wie kann ich...?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
            
            {/* Smart Suggestions Dropdown */}
            {suggestions.length > 0 && searchQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
                {suggestions.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => {
                      setSelectedArticle(article);
                      setSearchQuery("");
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <span className="text-sm">{CATEGORY_CONFIG[article.category]?.emoji || "📄"}</span>
                    <span className="text-sm truncate">{article.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="h-8"
            >
              Alle
            </Button>
            {categories.map((category) => {
              const config = CATEGORY_CONFIG[category];
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="h-8"
                >
                  {config.emoji} {config.label}
                </Button>
              );
            })}
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-4 pt-0 space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Lade Artikel...
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Keine Artikel gefunden.</p>
                <p className="text-sm mt-1">Probiere andere Suchbegriffe!</p>
              </div>
            ) : (
              <>
                {/* Featured Section (only when no search/category) */}
                {!searchQuery && !selectedCategory && featuredArticles.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Beliebt
                    </p>
                    {featuredArticles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        onClick={() => setSelectedArticle(article)}
                        featured
                      />
                    ))}
                  </div>
                )}

                {/* Articles List */}
                {(searchQuery || selectedCategory) && (
                  <div className="space-y-2">
                    {filteredArticles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        onClick={() => setSelectedArticle(article)}
                      />
                    ))}
                  </div>
                )}

                {/* All Articles when no filter */}
                {!searchQuery && !selectedCategory && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Alle Artikel
                    </p>
                    {roleFilteredArticles
                      .filter((a) => !a.is_featured)
                      .map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          onClick={() => setSelectedArticle(article)}
                        />
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface ArticleCardProps {
  article: HelpArticle;
  onClick: () => void;
  featured?: boolean;
}

function ArticleCard({ article, onClick, featured }: ArticleCardProps) {
  const config = CATEGORY_CONFIG[article.category];
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        "hover:bg-accent hover:border-primary/30",
        featured && "bg-primary/5 border-primary/20"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{config?.emoji || "📄"}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{article.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {article.content.slice(0, 80).replace(/[#*]/g, "")}...
          </p>
        </div>
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          {config?.label || article.category}
        </Badge>
      </div>
    </button>
  );
}
