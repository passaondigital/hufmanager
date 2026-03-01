import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, Eye, EyeOff, Sparkles } from "lucide-react";
import { BLOG_CATEGORIES, STARTER_BLOG_POSTS } from "@/data/websitePageTypes";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const WebsiteBlogManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["provider-blog-posts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("provider_blog_posts")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (post: any) => {
      if (!user?.id) throw new Error("Not authenticated");
      const slug = post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      
      if (post.id) {
        const { error } = await supabase
          .from("provider_blog_posts")
          .update({ ...post, slug, updated_at: new Date().toISOString() })
          .eq("id", post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("provider_blog_posts")
          .insert({ ...post, slug, owner_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-blog-posts"] });
      setDialogOpen(false);
      setEditingPost(null);
      toast({ title: "Artikel gespeichert" });
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("provider_blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-blog-posts"] });
      toast({ title: "Artikel gelöscht" });
    },
  });

  const createStarterPosts = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const postsToInsert = STARTER_BLOG_POSTS.map((p) => ({
        owner_id: user.id,
        title: p.title,
        slug: p.slug,
        content: p.content,
        excerpt: p.excerpt,
        category: p.category,
        is_published: false,
      }));
      const { error } = await supabase.from("provider_blog_posts").insert(postsToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-blog-posts"] });
      toast({ title: "Starter-Artikel erstellt", description: "Du kannst sie anpassen und veröffentlichen." });
    },
  });

  const openEditor = (post?: any) => {
    setEditingPost(post || { title: "", content: "", excerpt: "", category: "news", is_published: false, seo_title: "", seo_description: "" });
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Blog-Artikel</CardTitle>
              <CardDescription>Teile dein Fachwissen — werde zur Autorität in deiner Region</CardDescription>
            </div>
            <Button onClick={() => openEditor()} className="gap-2">
              <Plus className="h-4 w-4" />
              Neuer Artikel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(!posts || posts.length === 0) ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">Noch keine Blog-Artikel vorhanden.</p>
              <Button variant="outline" onClick={() => createStarterPosts.mutate()} disabled={createStarterPosts.isPending} className="gap-2">
                <Sparkles className="h-4 w-4" />
                {createStarterPosts.isPending ? "Erstelle..." : "Starter-Artikel erstellen"}
              </Button>
              <p className="text-xs text-muted-foreground">3 vorgefertigte, SEO-optimierte Artikel zum Anpassen</p>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((post: any) => (
                <div key={post.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{post.title}</p>
                      {post.is_published ? (
                        <Badge variant="outline" className="text-green-600 border-green-600/30 text-xs"><Eye className="h-3 w-3 mr-1" />Live</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs"><EyeOff className="h-3 w-3 mr-1" />Entwurf</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {BLOG_CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
                      {post.published_at && ` · ${format(new Date(post.published_at), "dd.MM.yyyy", { locale: de })}`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEditor(post)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(post.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blog Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost?.id ? "Artikel bearbeiten" : "Neuer Artikel"}</DialogTitle>
          </DialogHeader>
          {editingPost && (
            <BlogPostForm
              post={editingPost}
              onSave={(data) => saveMutation.mutate(data)}
              isSaving={saveMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function BlogPostForm({ post, onSave, isSaving }: { post: any; onSave: (data: any) => void; isSaving: boolean }) {
  const [title, setTitle] = useState(post.title || "");
  const [content, setContent] = useState(post.content || "");
  const [excerpt, setExcerpt] = useState(post.excerpt || "");
  const [category, setCategory] = useState(post.category || "news");
  const [isPublished, setIsPublished] = useState(post.is_published || false);
  const [seoTitle, setSeoTitle] = useState(post.seo_title || "");
  const [seoDesc, setSeoDesc] = useState(post.seo_description || "");

  const handleSave = () => {
    if (!title.trim()) { return; }
    onSave({
      ...(post.id ? { id: post.id } : {}),
      title,
      content,
      excerpt,
      category,
      is_published: isPublished,
      published_at: isPublished ? (post.published_at || new Date().toISOString()) : null,
      seo_title: seoTitle || null,
      seo_description: seoDesc || null,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Titel *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Artikeltitel" />
      </div>
      <div>
        <label className="text-sm font-medium">Vorschautext</label>
        <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Kurzbeschreibung für die Übersicht" />
      </div>
      <div>
        <label className="text-sm font-medium">Kategorie</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {BLOG_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Inhalt</label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} placeholder="Artikel schreiben..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">SEO Titel (optional)</label>
          <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Eigener Google-Titel" />
        </div>
        <div>
          <label className="text-sm font-medium">SEO Beschreibung (optional)</label>
          <Input value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} placeholder="Google-Beschreibung" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          <span className="text-sm">{isPublished ? "Veröffentlicht" : "Entwurf"}</span>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Speichern
        </Button>
      </div>
    </div>
  );
}
