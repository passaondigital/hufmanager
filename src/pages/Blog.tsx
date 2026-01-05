import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, featured_image_url, author_name, published_at, created_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/hufmanager-logo.png" 
              alt="Hufmanager" 
              className="h-8 w-auto"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="https://www.hufmanager.de/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="https://www.hufmanager.de/#preise" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Preise
            </a>
            <a href="https://www.hufmanager.de/kalkulator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Kalkulator
            </a>
            <Link to="/blog" className="text-sm font-medium text-foreground">
              Blog
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <a href="https://www.hufmanager.de/#preise">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Kostenlos testen
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
            Insider Wissen.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Tipps, Tricks & Visionen für Hufbearbeiter.
          </p>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Noch keine Artikel veröffentlicht.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {posts.map((post) => (
                <Link 
                  key={post.id} 
                  to={`/blog/${post.slug}`}
                  className="group"
                >
                  <Card className="overflow-hidden border-0 bg-card/50 hover:bg-card transition-colors h-full">
                    {post.featured_image_url ? (
                      <div className="aspect-[16/10] overflow-hidden">
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <span className="text-4xl opacity-30">📰</span>
                      </div>
                    )}
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(
                            new Date(post.published_at || post.created_at),
                            "d. MMMM yyyy",
                            { locale: de }
                          )}
                        </span>
                      </div>
                      <h2 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center text-sm text-primary font-medium pt-2">
                        Weiterlesen
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Hufmanager. Alle Rechte vorbehalten.</p>
          <div className="flex justify-center gap-4 mt-4">
            <a href="https://www.hufmanager.de/impressum" className="hover:text-foreground">
              Impressum
            </a>
            <a href="https://www.hufmanager.de/datenschutz" className="hover:text-foreground">
              Datenschutz
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
