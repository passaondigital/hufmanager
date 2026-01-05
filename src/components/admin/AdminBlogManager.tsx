import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  PenSquare, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Loader2,
  FileText,
  ExternalLink,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  X
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  author_name: string | null;
  is_published: boolean;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminBlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formExcerpt, setFormExcerpt] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formAuthor, setFormAuthor] = useState("HufManager Team");
  const [formMetaTitle, setFormMetaTitle] = useState("");
  const [formMetaDescription, setFormMetaDescription] = useState("");
  const [formIsPublished, setFormIsPublished] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error("Error fetching posts:", error);
      toast.error("Fehler beim Laden der Blog-Posts");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormTitle(title);
    if (!editingPost) {
      setFormSlug(generateSlug(title));
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilder hochladen");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild darf maximal 5MB groß sein");
      return;
    }

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `blog/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("blog-images")
        .getPublicUrl(filePath);

      setFormImageUrl(urlData.publicUrl);
      toast.success("Bild hochgeladen");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Fehler beim Hochladen");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setFormImageUrl("");
  };

  const openNewDialog = () => {
    setEditingPost(null);
    setFormTitle("");
    setFormSlug("");
    setFormExcerpt("");
    setFormContent("");
    setFormImageUrl("");
    setFormAuthor("HufManager Team");
    setFormMetaTitle("");
    setFormMetaDescription("");
    setFormIsPublished(false);
    setDialogOpen(true);
  };

  const openEditDialog = (post: BlogPost) => {
    setEditingPost(post);
    setFormTitle(post.title);
    setFormSlug(post.slug);
    setFormExcerpt(post.excerpt || "");
    setFormContent(post.content);
    setFormImageUrl(post.featured_image_url || "");
    setFormAuthor(post.author_name || "HufManager Team");
    setFormMetaTitle(post.meta_title || "");
    setFormMetaDescription(post.meta_description || "");
    setFormIsPublished(post.is_published);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle || !formSlug || !formContent) {
      toast.error("Bitte Titel, Slug und Inhalt ausfüllen");
      return;
    }

    setSaving(true);
    try {
      const postData = {
        title: formTitle,
        slug: formSlug,
        excerpt: formExcerpt || null,
        content: formContent,
        featured_image_url: formImageUrl || null,
        author_name: formAuthor || null,
        meta_title: formMetaTitle || null,
        meta_description: formMetaDescription || null,
        is_published: formIsPublished,
        published_at: formIsPublished ? new Date().toISOString() : null,
      };

      if (editingPost) {
        const { error } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", editingPost.id);

        if (error) throw error;
        toast.success("Blog-Post aktualisiert");
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .insert(postData);

        if (error) throw error;
        toast.success("Blog-Post erstellt");
      }

      setDialogOpen(false);
      fetchPosts();
    } catch (error: any) {
      console.error("Error saving post:", error);
      toast.error(error.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          is_published: !post.is_published,
          published_at: !post.is_published ? new Date().toISOString() : null,
        })
        .eq("id", post.id);

      if (error) throw error;
      toast.success(post.is_published ? "Post deaktiviert" : "Post veröffentlicht");
      fetchPosts();
    } catch (error: any) {
      console.error("Error toggling publish:", error);
      toast.error("Fehler beim Ändern des Status");
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`"${post.title}" wirklich löschen?`)) return;

    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;
      toast.success("Blog-Post gelöscht");
      fetchPosts();
    } catch (error: any) {
      console.error("Error deleting post:", error);
      toast.error("Fehler beim Löschen");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Blog-Verwaltung
              </CardTitle>
              <CardDescription>
                Erstelle und verwalte Blog-Posts für www.hufmanager.de
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchPosts}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewDialog} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Neuer Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPost ? "Post bearbeiten" : "Neuer Blog-Post"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingPost 
                        ? `Bearbeite "${editingPost.title}"`
                        : "Erstelle einen neuen Blog-Beitrag für die Webseite"}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Titel *</Label>
                        <Input
                          value={formTitle}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          placeholder="Wie pflege ich Hufe richtig?"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug (URL) *</Label>
                        <Input
                          value={formSlug}
                          onChange={(e) => setFormSlug(e.target.value)}
                          placeholder="hufpflege-tipps"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Kurzbeschreibung (Excerpt)</Label>
                      <Textarea
                        value={formExcerpt}
                        onChange={(e) => setFormExcerpt(e.target.value)}
                        placeholder="Eine kurze Zusammenfassung für Vorschau-Karten..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Inhalt *</Label>
                      <Textarea
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        placeholder="Der vollständige Blog-Beitrag (HTML wird unterstützt)..."
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </div>

                    {/* Image Upload Section */}
                    <div className="space-y-3">
                      <Label>Featured Image</Label>
                      
                      {formImageUrl ? (
                        <div className="relative">
                          <img
                            src={formImageUrl}
                            alt="Featured"
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={handleRemoveImage}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploading ? (
                            <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Klicken zum Hochladen oder Bild hierher ziehen
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                JPG, PNG, WebP (max. 5MB)
                              </p>
                            </>
                          )}
                        </div>
                      )}
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">oder</span>
                        <Input
                          value={formImageUrl}
                          onChange={(e) => setFormImageUrl(e.target.value)}
                          placeholder="https://... (externe Bild-URL)"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Autor</Label>
                      <Input
                        value={formAuthor}
                        onChange={(e) => setFormAuthor(e.target.value)}
                        placeholder="HufManager Team"
                      />
                    </div>

                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium text-sm">SEO-Einstellungen</h4>
                      <div className="space-y-2">
                        <Label>Meta-Titel</Label>
                        <Input
                          value={formMetaTitle}
                          onChange={(e) => setFormMetaTitle(e.target.value)}
                          placeholder="Titel für Suchmaschinen (max. 60 Zeichen)"
                          maxLength={60}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Meta-Beschreibung</Label>
                        <Textarea
                          value={formMetaDescription}
                          onChange={(e) => setFormMetaDescription(e.target.value)}
                          placeholder="Beschreibung für Google (max. 160 Zeichen)"
                          maxLength={160}
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label>Veröffentlichen</Label>
                        <p className="text-sm text-muted-foreground">
                          Post auf www.hufmanager.de sichtbar machen
                        </p>
                      </div>
                      <Switch
                        checked={formIsPublished}
                        onCheckedChange={setFormIsPublished}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingPost ? "Speichern" : "Erstellen"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Noch keine Blog-Posts vorhanden</p>
              <p className="text-sm">Erstelle deinen ersten Beitrag!</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Bild</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        {post.featured_image_url ? (
                          <img
                            src={post.featured_image_url}
                            alt=""
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{post.title}</p>
                          <p className="text-sm text-muted-foreground">
                            /{post.slug}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {post.is_published ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <Eye className="w-3 h-3 mr-1" />
                            Live
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Entwurf
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{post.author_name || "—"}</TableCell>
                      <TableCell>
                        {format(new Date(post.created_at), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTogglePublish(post)}
                            title={post.is_published ? "Deaktivieren" : "Veröffentlichen"}
                          >
                            {post.is_published ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(post)}
                          >
                            <PenSquare className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(post)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {post.is_published && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
