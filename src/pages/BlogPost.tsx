import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, ArrowLeft, User, Loader2, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DOMPurify from "dompurify";

interface BlogPostData {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  meta_title: string | null;
  meta_description: string | null;
  content_type: "blog" | "video" | null;
  video_url: string | null;
  category: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  allgemein: "Allgemein",
  hufpflege: "Hufpflege",
  gesundheit: "Gesundheit",
  tipps: "Tipps & Tricks",
  news: "News",
  tutorial: "Tutorial",
};

// Sanitized content component to prevent XSS attacks
function SanitizedContent({ content }: { content: string }) {
  const sanitizedContent = useMemo(() => {
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i', 
                     'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'br', 
                     'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel', 'title', 'id'],
      ALLOW_DATA_ATTR: false,
    });
  }, [content]);

  return (
    <div 
      className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-img:rounded-xl"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}

// Video embed component
function VideoEmbed({ url }: { url: string }) {
  const embedUrl = useMemo(() => {
    // Convert YouTube watch URLs to embed URLs
    if (url.includes("youtube.com/watch")) {
      const videoId = new URL(url).searchParams.get("v");
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Convert YouTube short URLs
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Convert Vimeo URLs
    if (url.includes("vimeo.com/") && !url.includes("player.vimeo.com")) {
      const videoId = url.split("vimeo.com/")[1]?.split("?")[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  }, [url]);

  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden bg-muted mb-8">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Video"
      />
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  useEffect(() => {
    if (post) {
      // Update page title and meta
      document.title = post.meta_title || post.title + " | Hufi Blog";
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && post.meta_description) {
        metaDesc.setAttribute("content", post.meta_description);
      }
    }
  }, [post]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      setPost(data as BlogPostData);
    } catch (error) {
      console.error("Error fetching post:", error);
      setError(true);
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

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Artikel nicht gefunden</h1>
        <p className="text-muted-foreground">
          Der gesuchte Artikel existiert nicht oder wurde nicht veröffentlicht.
        </p>
        <Button onClick={() => navigate("/blog")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zum Blog
        </Button>
      </div>
    );
  }

  const isVideo = post.content_type === "video";
  const categoryLabel = post.category ? CATEGORY_LABELS[post.category] || post.category : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/blog" className="flex items-center gap-2">
            <img 
              src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" 
              alt="Hufi" 
              className="h-8 w-auto"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="https://hufiapp.de/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="https://hufiapp.de/#preise" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Preise
            </a>
            <a href="https://hufiapp.de/kalkulator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
            <a href="https://hufiapp.de/#preise">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                Kostenlos testen
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Back Button */}
      <div className="container mx-auto px-4 py-6">
        <Link 
          to="/blog" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zum Blog
        </Link>
      </div>

      {/* Article */}
      <article className="container mx-auto px-4 pb-16">
        <div className="max-w-3xl mx-auto">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-4">
            {isVideo ? (
              <Badge variant="default" className="bg-blue-500">
                <Video className="w-3 h-3 mr-1" />
                Video
              </Badge>
            ) : (
              <Badge variant="secondary">
                <FileText className="w-3 h-3 mr-1" />
                Artikel
              </Badge>
            )}
            {categoryLabel && (
              <Badge variant="outline">{categoryLabel}</Badge>
            )}
          </div>

          {/* Video Embed (for video content type) */}
          {isVideo && post.video_url && (
            <VideoEmbed url={post.video_url} />
          )}

          {/* Featured Image (for blog posts without video) */}
          {!isVideo && post.featured_image_url && (
            <div className="aspect-video overflow-hidden rounded-xl mb-8">
              <img
                src={post.featured_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {format(
                  new Date(post.published_at || post.created_at),
                  "d. MMMM yyyy",
                  { locale: de }
                )}
              </span>
            </div>
            {post.author_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.author_name}</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8 leading-tight">
            {post.title}
          </h1>

          {/* Content - sanitized to prevent XSS */}
          <SanitizedContent content={post.content} />
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Hufi. Alle Rechte vorbehalten.</p>
          <div className="flex justify-center gap-4 mt-4">
            <a href="https://hufiapp.de/impressum" className="hover:text-foreground">
              Impressum
            </a>
            <a href="https://hufiapp.de/datenschutz" className="hover:text-foreground">
              Datenschutz
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
