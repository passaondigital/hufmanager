import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const LatestBlogPosts = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["latest-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  if (!isLoading && (!posts || posts.length === 0)) return null;

  return (
    <section className="py-20 md:py-32 bg-zinc-950">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-primary font-bold text-sm uppercase tracking-widest">Wissen & Tipps</span>
          <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-6">Neueste Artikel</h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">Praktische Tipps und Einblicke rund um die digitale Hufpflege.</p>
        </div>
        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-zinc-800" />
                <div className="p-6"><div className="h-3 bg-zinc-800 rounded w-1/3 mb-3" /><div className="h-5 bg-zinc-800 rounded w-full mb-2" /><div className="h-4 bg-zinc-800 rounded w-2/3" /></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {posts?.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300">
                  {post.featured_image_url ? (
                    <div className="aspect-video overflow-hidden bg-zinc-800">
                      <img src={post.featured_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-zinc-800 flex items-center justify-center"><BookOpen className="w-12 h-12 text-white/20" /></div>
                  )}
                  <div className="p-6">
                    {post.published_at && (
                      <div className="flex items-center gap-2 text-sm text-white/40 mb-3">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(post.published_at), "d. MMMM yyyy", { locale: de })}</span>
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                    {post.excerpt && <p className="text-white/50 text-sm line-clamp-2 mb-4">{post.excerpt}</p>}
                    <span className="inline-flex items-center gap-1 text-primary text-sm font-medium">Weiterlesen <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-12">
              <Button variant="outline" asChild className="border-white/20 text-white hover:bg-white/10">
                <Link to="/blog">Alle Artikel ansehen<ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default LatestBlogPosts;
