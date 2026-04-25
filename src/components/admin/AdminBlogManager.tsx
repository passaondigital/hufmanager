import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  X,
  Video,
  Calendar,
  Clock,
  List
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import RichTextEditor from "./RichTextEditor";
import ContentCalendar from "./ContentCalendar";

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
  scheduled_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  content_type: "blog" | "video";
  video_url: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "allgemein", label: "Allgemein" },
  { value: "hufpflege", label: "Hufpflege" },
  { value: "gesundheit", label: "Gesundheit" },
  { value: "tipps", label: "Tipps & Tricks" },
  { value: "news", label: "News" },
  { value: "tutorial", label: "Tutorial" },
];

export default function AdminBlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [activeTab, setActiveTab] = useState<"calendar" | "list">("calendar");
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
  const [formContentType, setFormContentType] = useState<"blog" | "video">("blog");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formCategory, setFormCategory] = useState("allgemein");
  const [formScheduledAt, setFormScheduledAt] = useState("");

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
      setPosts((data || []).map(post => ({
        ...post,
        content_type: post.content_type || "blog",
        category: post.category || "allgemein",
      })) as BlogPost[]);
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

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilder hochladen");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild darf maximal 5MB groß sein");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `blog/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setFormImageUrl("");
  };

  const openNewDialog = (date?: Date) => {
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
    setFormContentType("blog");
    setFormVideoUrl("");
    setFormCategory("allgemein");
    setFormScheduledAt(date ? format(date, "yyyy-MM-dd'T'HH:mm") : "");
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
    setFormContentType(post.content_type || "blog");
    setFormVideoUrl(post.video_url || "");
    setFormCategory(post.category || "allgemein");
    setFormScheduledAt(post.scheduled_at ? format(new Date(post.scheduled_at), "yyyy-MM-dd'T'HH:mm") : "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle || !formSlug || !formContent) {
      toast.error("Bitte Titel, Slug und Inhalt ausfüllen");
      return;
    }

    if (formContentType === "video" && !formVideoUrl) {
      toast.error("Bitte Video-URL angeben");
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
        content_type: formContentType,
        video_url: formContentType === "video" ? formVideoUrl : null,
        category: formCategory,
        scheduled_at: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
      };

      if (editingPost) {
        const { error } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", editingPost.id);

        if (error) throw error;
        toast.success("Content aktualisiert");
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .insert(postData);

        if (error) throw error;
        toast.success("Content erstellt");
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
          scheduled_at: !post.is_published ? null : post.scheduled_at, // Clear schedule when publishing
        })
        .eq("id", post.id);

      if (error) throw error;
      toast.success(post.is_published ? "Content deaktiviert" : "Content veröffentlicht");
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
      toast.success("Content gelöscht");
      fetchPosts();
    } catch (error: any) {
      console.error("Error deleting post:", error);
      toast.error("Fehler beim Löschen");
    }
  };

  const getStatusBadge = (post: BlogPost) => {
    if (post.is_published) {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <Eye className="w-3 h-3 mr-1" />
          Live
        </Badge>
      );
    }
    if (post.scheduled_at) {
      const scheduledDate = new Date(post.scheduled_at);
      const isPast = scheduledDate < new Date();
      return (
        <Badge className={isPast ? "bg-orange-500/10 text-orange-600" : "bg-blue-500/10 text-blue-600"}>
          <Clock className="w-3 h-3 mr-1" />
          {isPast ? "Überfällig" : format(scheduledDate, "dd.MM. HH:mm")}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <EyeOff className="w-3 h-3 mr-1" />
        Entwurf
      </Badge>
    );
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
                Content-Verwaltung
              </CardTitle>
              <CardDescription>
                Blog-Posts und Videos planen, erstellen und verwalten
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchPosts}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openNewDialog()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Neuer Content
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPost ? "Content bearbeiten" : "Neuer Content"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingPost 
                        ? `Bearbeite "${editingPost.title}"`
                        : "Erstelle einen neuen Blog-Beitrag oder Video"}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Content Type & Category */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Content-Typ</Label>
                        <Select value={formContentType} onValueChange={(v: "blog" | "video") => setFormContentType(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="blog">
                              <span className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Blog-Post
                              </span>
                            </SelectItem>
                            <SelectItem value="video">
                              <span className="flex items-center gap-2">
                                <Video className="w-4 h-4" />
                                Video
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Kategorie</Label>
                        <Select value={formCategory} onValueChange={setFormCategory}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Geplante Veröffentlichung</Label>
                        <Input
                          type="datetime-local"
                          value={formScheduledAt}
                          onChange={(e) => setFormScheduledAt(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Title & Slug */}
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

                    {/* Video URL (only for video type) */}
                    {formContentType === "video" && (
                      <div className="space-y-2">
                        <Label>Video-URL *</Label>
                        <Input
                          value={formVideoUrl}
                          onChange={(e) => setFormVideoUrl(e.target.value)}
                          placeholder="https://www.youtube.com/embed/... oder https://vimeo.com/..."
                        />
                        <p className="text-xs text-muted-foreground">
                          YouTube oder Vimeo Embed-URL einfügen
                        </p>
                      </div>
                    )}

                    {/* Excerpt */}
                    <div className="space-y-2">
                      <Label>Kurzbeschreibung (Excerpt)</Label>
                      <Input
                        value={formExcerpt}
                        onChange={(e) => setFormExcerpt(e.target.value)}
                        placeholder="Eine kurze Zusammenfassung für Vorschau-Karten..."
                      />
                    </div>

                    {/* Rich Text Editor */}
                    <div className="space-y-2">
                      <Label>Inhalt *</Label>
                      <RichTextEditor
                        content={formContent}
                        onChange={setFormContent}
                        placeholder="Beginne hier zu schreiben..."
                      />
                    </div>

                    {/* Featured Image */}
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
                                Klicken zum Hochladen
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

                    {/* Author */}
                    <div className="space-y-2">
                      <Label>Autor</Label>
                      <Input
                        value={formAuthor}
                        onChange={(e) => setFormAuthor(e.target.value)}
                        placeholder="HufManager Team"
                      />
                    </div>

                    {/* SEO Settings */}
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium text-sm">SEO-Einstellungen</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Meta-Titel</Label>
                          <Input
                            value={formMetaTitle}
                            onChange={(e) => setFormMetaTitle(e.target.value)}
                            placeholder="Titel für Suchmaschinen (max. 60)"
                            maxLength={60}
                          />
                          <p className="text-xs text-muted-foreground">{formMetaTitle.length}/60</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Meta-Beschreibung</Label>
                          <Input
                            value={formMetaDescription}
                            onChange={(e) => setFormMetaDescription(e.target.value)}
                            placeholder="Beschreibung für Google (max. 160)"
                            maxLength={160}
                          />
                          <p className="text-xs text-muted-foreground">{formMetaDescription.length}/160</p>
                        </div>
                      </div>
                    </div>

                    {/* Publish Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label>Sofort veröffentlichen</Label>
                        <p className="text-sm text-muted-foreground">
                          {formScheduledAt 
                            ? "Deaktiviert wenn geplante Veröffentlichung gesetzt ist"
                            : "Content auf hufiapp.de sichtbar machen"}
                        </p>
                      </div>
                      <Switch
                        checked={formIsPublished}
                        onCheckedChange={(checked) => {
                          setFormIsPublished(checked);
                          if (checked) setFormScheduledAt(""); // Clear schedule when publishing immediately
                        }}
                        disabled={!!formScheduledAt}
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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "calendar" | "list")}>
            <TabsList className="mb-4">
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="w-4 h-4" />
                Kalender
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="w-4 h-4" />
                Liste
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <ContentCalendar
                items={posts}
                onItemClick={openEditDialog}
                onDateClick={(date) => openNewDialog(date)}
              />
            </TabsContent>

            <TabsContent value="list">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Noch kein Content vorhanden</p>
                  <p className="text-sm">Erstelle deinen ersten Beitrag!</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Typ</TableHead>
                        <TableHead className="w-16">Bild</TableHead>
                        <TableHead>Titel</TableHead>
                        <TableHead>Kategorie</TableHead>
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
                            {post.content_type === "video" ? (
                              <Video className="w-4 h-4 text-blue-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
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
                            <Badge variant="outline">
                              {CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(post)}</TableCell>
                          <TableCell>{post.author_name || "—"}</TableCell>
                          <TableCell>
                            {format(new Date(post.created_at), "dd.MM.yyyy", { locale: de })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
