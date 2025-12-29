import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
  Plus,
  Quote,
  Download,
  Send,
  Mail,
  Loader2,
  Copy,
  CheckCircle2,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  ThumbsUp,
  Heart,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const feedbackSourceLabels: Record<string, string> = {
  intern: "Intern",
  google: "Google",
  screenshot: "Screenshot",
};

const reviewSourceLabels: Record<string, string> = {
  App: "App",
  WhatsApp: "WhatsApp",
  Google: "Google",
  Email: "E-Mail",
};

interface Feedback {
  id: string;
  customer_name: string;
  rating: number;
  text: string | null;
  source: string | null;
  is_featured: boolean | null;
  created_at: string;
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  text: string | null;
  source: string | null;
  proof_image_url: string | null;
  is_visible: boolean;
  is_approved: boolean;
  reactions: { green: number; yellow: number; red: number } | null;
  created_at: string;
}

interface Client {
  id: string;
  full_name: string | null;
  email: string | null;
}

const Auffassen = () => {
  const { user } = useAuth();
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newRating, setNewRating] = useState(5);
  const [feedbackFormData, setFeedbackFormData] = useState({
    customerName: "",
    source: "intern",
    text: "",
  });
  const [reviewFormData, setReviewFormData] = useState({
    reviewerName: "",
    source: "App",
    text: "",
    proofImage: null as File | null,
  });
  const [linkCopied, setLinkCopied] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch feedbacks
  const { data: feedbacks = [] } = useQuery({
    queryKey: ["feedbacks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Feedback[];
    },
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        ...r,
        reactions: (r.reactions as { green: number; yellow: number; red: number } | null) || { green: 0, yellow: 0, red: 0 },
      })) as Review[];
    },
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-review"],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: accessData } = await supabase
        .from('access_grants')
        .select('client_id, profiles:client_id(id, full_name, email)')
        .eq('provider_id', user.id)
        .eq('is_active', true);
      
      const clients: Client[] = [];
      if (accessData) {
        accessData.forEach((ag: any) => {
          if (ag.profiles?.id) {
            clients.push({
              id: ag.profiles.id,
              full_name: ag.profiles.full_name,
              email: ag.profiles.email,
            });
          }
        });
      }
      
      const { data: createdProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('created_by_provider_id', user.id)
        .is('deleted_at', null);
      
      if (createdProfiles) {
        createdProfiles.forEach((p) => {
          if (!clients.find(c => c.id === p.id)) {
            clients.push({
              id: p.id,
              full_name: p.full_name,
              email: p.email,
            });
          }
        });
      }
      
      return clients;
    },
  });

  // Mutations
  const createFeedback = useMutation({
    mutationFn: async (data: { customer_name: string; rating: number; text: string; source: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      
      const { error } = await supabase.from("feedbacks").insert({
        ...data,
        is_featured: false,
        provider_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      toast({ title: "Erfolg", description: "Feedback wurde gespeichert." });
      setShowFeedbackForm(false);
      setFeedbackFormData({ customerName: "", source: "intern", text: "" });
      setNewRating(5);
    },
    onError: () => {
      toast({ title: "Fehler", description: "Feedback konnte nicht gespeichert werden.", variant: "destructive" });
    },
  });

  const createReview = useMutation({
    mutationFn: async (data: { 
      reviewer_name: string; 
      rating: number; 
      text: string; 
      source: string;
      proof_image_url: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      
      const { error } = await supabase.from("reviews").insert({
        ...data,
        is_approved: true,
        is_visible: true,
        provider_id: user.id,
        reactions: { green: 0, yellow: 0, red: 0 },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: "Erfolg", description: "Bewertung wurde hinzugefügt." });
      setShowReviewForm(false);
      setReviewFormData({ reviewerName: "", source: "App", text: "", proofImage: null });
      setNewRating(5);
    },
    onError: () => {
      toast({ title: "Fehler", description: "Bewertung konnte nicht gespeichert werden.", variant: "destructive" });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase.from("feedbacks").update({ is_featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    },
  });

  const toggleReviewVisibility = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_visible }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: "Sichtbarkeit aktualisiert" });
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: "Bewertung gelöscht" });
    },
  });

  const handleFeedbackSubmit = () => {
    if (!feedbackFormData.customerName || !feedbackFormData.text) {
      toast({ title: "Fehler", description: "Bitte füllen Sie alle Felder aus.", variant: "destructive" });
      return;
    }
    createFeedback.mutate({
      customer_name: feedbackFormData.customerName,
      rating: newRating,
      text: feedbackFormData.text,
      source: feedbackFormData.source,
    });
  };

  const handleReviewSubmit = async () => {
    if (!reviewFormData.reviewerName || !reviewFormData.text) {
      toast({ title: "Fehler", description: "Bitte füllen Sie alle Felder aus.", variant: "destructive" });
      return;
    }

    let proofImageUrl: string | null = null;

    // Upload proof image if provided
    if (reviewFormData.proofImage && user) {
      setUploadingImage(true);
      try {
        const fileExt = reviewFormData.proofImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('gallery')
          .upload(fileName, reviewFormData.proofImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('gallery')
          .getPublicUrl(fileName);
        
        proofImageUrl = urlData.publicUrl;
      } catch (error) {
        console.error("Upload error:", error);
        toast({ title: "Fehler", description: "Bild konnte nicht hochgeladen werden.", variant: "destructive" });
        setUploadingImage(false);
        return;
      }
      setUploadingImage(false);
    }

    createReview.mutate({
      reviewer_name: reviewFormData.reviewerName,
      rating: newRating,
      text: reviewFormData.text,
      source: reviewFormData.source,
      proof_image_url: proofImageUrl,
    });
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Kunde", "Bewertung", "Quelle", "Text", "Datum"].join(","),
      ...feedbacks.map((f) =>
        [
          `"${f.customer_name}"`,
          f.rating,
          f.source,
          `"${f.text?.replace(/"/g, '""') || ""}"`,
          new Date(f.created_at).toLocaleDateString("de-DE"),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `feedbacks_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({ title: "Export", description: "CSV wurde heruntergeladen." });
  };

  const avgFeedbackRating = feedbacks.length
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : "0.0";

  const avgReviewRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const totalReactions = reviews.reduce((sum, r) => {
    const reactions = r.reactions || { green: 0, yellow: 0, red: 0 };
    return sum + reactions.green + reactions.yellow + reactions.red;
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auffassen</h1>
          <p className="text-muted-foreground mt-1">
            Sammeln und verwalten Sie Kundenfeedback und Bewertungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowRequestModal(true)}>
            <Send className="h-4 w-4" />
            Rezension anfragen
          </Button>
        </div>
      </div>

      <Tabs defaultValue="reviews" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reviews">Bewertungen ({reviews.length})</TabsTrigger>
          <TabsTrigger value="feedbacks">Internes Feedback ({feedbacks.length})</TabsTrigger>
        </TabsList>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{avgReviewRating}</p>
                  <p className="text-sm text-muted-foreground">Durchschnitt</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Quote className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
                  <p className="text-sm text-muted-foreground">Bewertungen</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Eye className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {reviews.filter((r) => r.is_visible).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Sichtbar</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-rose-500/10">
                  <Heart className="h-6 w-6 text-rose-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalReactions}</p>
                  <p className="text-sm text-muted-foreground">Reaktionen</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add Review Button */}
          <Button className="gap-2" onClick={() => setShowReviewForm(!showReviewForm)}>
            <Plus className="h-4 w-4" />
            Bewertung hinzufügen
          </Button>

          {/* Add Review Form */}
          {showReviewForm && (
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle>Neue Bewertung hinzufügen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name des Bewerters</Label>
                    <Input
                      placeholder="Name eingeben..."
                      value={reviewFormData.reviewerName}
                      onChange={(e) => setReviewFormData({ ...reviewFormData, reviewerName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quelle</Label>
                    <Select
                      value={reviewFormData.source}
                      onValueChange={(value) => setReviewFormData({ ...reviewFormData, source: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Quelle auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="App">App</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Google">Google</SelectItem>
                        <SelectItem value="Email">E-Mail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bewertung</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={cn(
                            "h-8 w-8",
                            star <= newRating
                              ? "text-amber-500 fill-amber-500"
                              : "text-muted-foreground"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bewertungstext</Label>
                  <Textarea
                    placeholder="Die Bewertung des Kunden..."
                    rows={4}
                    value={reviewFormData.text}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, text: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Screenshot-Nachweis (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setReviewFormData({ ...reviewFormData, proofImage: file });
                        }
                      }}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Bild hochladen
                    </Button>
                    {reviewFormData.proofImage && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{reviewFormData.proofImage.name}</span>
                        <button
                          onClick={() => setReviewFormData({ ...reviewFormData, proofImage: null })}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Screenshot von WhatsApp, Google, etc. als Nachweis (Trust-on-Demand)
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowReviewForm(false)}>
                    Abbrechen
                  </Button>
                  <Button 
                    onClick={handleReviewSubmit} 
                    disabled={createReview.isPending || uploadingImage}
                  >
                    {(createReview.isPending || uploadingImage) ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Speichern...</>
                    ) : (
                      "Speichern"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.map((review, index) => {
              const reactions = review.reactions || { green: 0, yellow: 0, red: 0 };
              return (
                <Card
                  key={review.id}
                  className={cn(
                    "animate-slide-up",
                    !review.is_visible && "opacity-60"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{review.reviewer_name}</h3>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "h-4 w-4",
                                  star <= review.rating
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-muted-foreground"
                                )}
                              />
                            ))}
                          </div>
                          <Badge variant="outline">{reviewSourceLabels[review.source || "App"]}</Badge>
                          {review.proof_image_url && (
                            <Badge variant="secondary" className="gap-1">
                              <ImageIcon className="h-3 w-3" />
                              Nachweis
                            </Badge>
                          )}
                          <Badge variant={review.is_visible ? "default" : "outline"} className="gap-1">
                            {review.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {review.is_visible ? "Sichtbar" : "Verborgen"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground italic">"{review.text}"</p>
                        
                        {/* Reaction Stats */}
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1 text-green-600">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{reactions.green} Stimme zu</span>
                          </div>
                          <div className="flex items-center gap-1 text-amber-600">
                            <Sparkles className="h-4 w-4" />
                            <span>{reactions.yellow} Hilfreich</span>
                          </div>
                          <div className="flex items-center gap-1 text-rose-600">
                            <Heart className="h-4 w-4" />
                            <span>{reactions.red} Begeistert</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-2">
                          {new Date(review.created_at).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`visibility-${review.id}`} className="text-sm text-muted-foreground">
                            Sichtbar
                          </Label>
                          <Switch
                            id={`visibility-${review.id}`}
                            checked={review.is_visible}
                            onCheckedChange={(checked) =>
                              toggleReviewVisibility.mutate({ id: review.id, is_visible: checked })
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteReview.mutate(review.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {reviews.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Quote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Noch keine Bewertungen vorhanden. Fügen Sie eine hinzu oder fordern Sie eine Rezension an.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Feedbacks Tab */}
        <TabsContent value="feedbacks" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{avgFeedbackRating}</p>
                  <p className="text-sm text-muted-foreground">Durchschnitt</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Quote className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{feedbacks.length}</p>
                  <p className="text-sm text-muted-foreground">Feedbacks</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Star className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {feedbacks.filter((f) => f.is_featured).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Auf Landingpage</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add Feedback Button */}
          <Button className="gap-2" onClick={() => setShowFeedbackForm(!showFeedbackForm)}>
            <Plus className="h-4 w-4" />
            Feedback hinzufügen
          </Button>

          {/* Add Feedback Form */}
          {showFeedbackForm && (
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle>Neues Feedback hinzufügen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kunde</Label>
                    <Select
                      value={feedbackFormData.customerName}
                      onValueChange={(value) => setFeedbackFormData({ ...feedbackFormData, customerName: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kunde auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.full_name || client.email || "Unbekannt"}>
                            {client.full_name || client.email || "Unbekannt"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quelle</Label>
                    <Select
                      value={feedbackFormData.source}
                      onValueChange={(value) => setFeedbackFormData({ ...feedbackFormData, source: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Quelle auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intern">Intern erfasst</SelectItem>
                        <SelectItem value="google">Google Review</SelectItem>
                        <SelectItem value="screenshot">Screenshot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bewertung</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={cn(
                            "h-8 w-8",
                            star <= newRating
                              ? "text-amber-500 fill-amber-500"
                              : "text-muted-foreground"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Feedback-Text</Label>
                  <Textarea
                    placeholder="Das Feedback des Kunden..."
                    rows={4}
                    value={feedbackFormData.text}
                    onChange={(e) => setFeedbackFormData({ ...feedbackFormData, text: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowFeedbackForm(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleFeedbackSubmit} disabled={createFeedback.isPending}>
                    {createFeedback.isPending ? "Speichern..." : "Speichern"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback List */}
          <div className="space-y-4">
            {feedbacks.map((feedback, index) => (
              <Card
                key={feedback.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{feedback.customer_name}</h3>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "h-4 w-4",
                                star <= feedback.rating
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-muted-foreground"
                              )}
                            />
                          ))}
                        </div>
                        <Badge variant="outline">{feedbackSourceLabels[feedback.source || "intern"]}</Badge>
                        {feedback.is_featured && (
                          <Badge className="bg-accent/10 text-accent">Auf Landingpage</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground italic">"{feedback.text}"</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {new Date(feedback.created_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleFeatured.mutate({ id: feedback.id, is_featured: !feedback.is_featured })
                        }
                      >
                        {feedback.is_featured ? "Entfernen" : "Hervorheben"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Rezension anfragen
            </DialogTitle>
            <DialogDescription>
              Wählen Sie einen Kunden aus, um eine Bewertungsanfrage zu senden.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Kunde auswählen</Label>
              <Select
                value={selectedClient?.id || ""}
                onValueChange={(value) => {
                  const client = clients.find(c => c.id === value);
                  setSelectedClient(client || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kunde wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name || client.email || "Unbekannt"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClient && (
              <div className="space-y-4 pt-4 border-t">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">Bewertungslink für {selectedClient.full_name}:</p>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={`${window.location.origin}/bewertung/${user?.id}?kunde=${encodeURIComponent(selectedClient.full_name || '')}`}
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/bewertung/${user?.id}?kunde=${encodeURIComponent(selectedClient.full_name || '')}`
                        );
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                        toast({ title: "Link kopiert!" });
                      }}
                    >
                      {linkCopied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {selectedClient.email && (
                  <Button 
                    className="w-full gap-2"
                    onClick={() => {
                      const subject = encodeURIComponent("Ihre Meinung ist uns wichtig!");
                      const body = encodeURIComponent(
                        `Hallo ${selectedClient.full_name},\n\nwir hoffen, Sie sind mit unserer Arbeit zufrieden. Wir würden uns sehr freuen, wenn Sie uns eine kurze Bewertung hinterlassen könnten.\n\nBewertung abgeben: ${window.location.origin}/bewertung/${user?.id}?kunde=${encodeURIComponent(selectedClient.full_name || '')}\n\nVielen Dank!\n\nMit freundlichen Grüßen`
                      );
                      window.location.href = `mailto:${selectedClient.email}?subject=${subject}&body=${body}`;
                      setShowRequestModal(false);
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    Per E-Mail anfragen
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => {
                setShowRequestModal(false);
                setSelectedClient(null);
              }}>
                Schließen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auffassen;
