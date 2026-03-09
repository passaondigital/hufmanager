import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building,
  Globe,
  CreditCard,
  Upload,
  Save,
  Calendar,
  Loader2,
  X,
  Clock,
  Bell,
  Crown,
  FileText,
  Briefcase,
  AlertTriangle,
  Star,
  Info,
  Settings,
} from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { BusinessHoursEditor, defaultHours, type BusinessHours } from "@/components/BusinessHoursEditor";
import { ReminderSettingsCard } from "@/components/ReminderSettingsCard";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { LandingServicesEditor } from "@/components/landing/LandingServicesEditor";
import { ReviewsManagement } from "@/components/management/ReviewsManagement";
import { SectionManager } from "@/components/landing/SectionManager";
import { GalleryManager } from "@/components/management/GalleryManager";
import { AVVSigningCard } from "@/components/settings/AVVSigningCard";
import { DataExportSection } from "@/components/settings/DataExportSection";
import { DeleteProviderAccountSection } from "@/components/settings/DeleteProviderAccountSection";
import { PaymentSettingsCard } from "@/components/settings/PaymentSettingsCard";
import { AppSettingsCard } from "@/components/settings/AppSettingsCard";
import { CommunicationSettingsCard } from "@/components/settings/CommunicationSettingsCard";
import { KiSettingsCard } from "@/components/settings/KiSettingsCard";
import { CompanyLocationCard } from "@/components/settings/CompanyLocationCard";
import { TutorialSettingsCard } from "@/components/settings/TutorialSettingsCard";
import { ManagementTab } from "@/components/management/ManagementTab";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface BusinessSettings {
  id: string;
  user_id: string;
  business_name: string | null;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_number: string | null;
  logo_url: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  hero_headline: string | null;
  about_text: string | null;
  accept_new_customers: boolean | null;
  primary_color: string | null;
  stripe_public_key: string | null;
  copecart_vendor_id: string | null;
  paypal_link: string | null;
  impressum_text: string | null;
  terms_text: string | null;
}

const Management = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    business_name: "",
    owner_name: "",
    email: "",
    phone: "",
    address: "",
    tax_number: "",
    subdomain: "",
    custom_domain: "",
    hero_headline: "",
    about_text: "",
    accept_new_customers: true,
    primary_color: "#d97706",
    stripe_public_key: "",
    copecart_vendor_id: "",
    paypal_link: "",
    impressum_text: "",
    terms_text: "",
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["business-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as BusinessSettings | null;
    },
    enabled: !!user?.id,
  });

  // Populate form when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        business_name: settings.business_name || "",
        owner_name: settings.owner_name || "",
        email: settings.email || "",
        phone: settings.phone || "",
        address: settings.address || "",
        tax_number: settings.tax_number || "",
        subdomain: settings.subdomain || "",
        custom_domain: settings.custom_domain || "",
        hero_headline: settings.hero_headline || "",
        about_text: settings.about_text || "",
        accept_new_customers: settings.accept_new_customers ?? true,
        primary_color: settings.primary_color || "#d97706",
        stripe_public_key: settings.stripe_public_key || "",
        copecart_vendor_id: settings.copecart_vendor_id || "",
        paypal_link: settings.paypal_link || "",
        impressum_text: settings.impressum_text || "",
        terms_text: settings.terms_text || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error("Not authenticated");

      if (settings) {
        // Update existing
        const { error } = await supabase
          .from("business_settings")
          .update({ ...data })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        // Create new (upsert to avoid duplicate key errors)
        const { error } = await supabase.from("business_settings").upsert({
          id: user.id,
          user_id: user.id,
          ...data,
        }, { onConflict: "id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings", user?.id] });
      toast({ title: "Gespeichert", description: "Einstellungen wurden gespeichert." });
    },
    onError: (err) => {
      console.error("business_settings save error:", err);
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    },
  });

  const saveLegalMutation = useMutation({
    mutationFn: async (payload: { impressum_text: string; terms_text: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Update only legal fields (robuster: weniger Felder = weniger Fehlerquellen)
      const { data: updated, error: updateError } = await supabase
        .from("business_settings")
        .update(payload)
        .eq("user_id", user.id)
        .select("id");

      if (updateError) throw updateError;

      // If no row existed (or RLS filtered it out without error), create one.
      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase.from("business_settings").upsert({
          id: user.id,
          user_id: user.id,
          ...payload,
        }, { onConflict: "id" });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings", user?.id] });
      toast({ title: "Gespeichert", description: "Rechtliches wurde gespeichert." });
    },
    onError: (err) => {
      console.error("business_settings legal save error:", err);
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Rechtliches konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleSaveLegal = () => {
    saveLegalMutation.mutate({
      impressum_text: formData.impressum_text,
      terms_text: formData.terms_text,
    });
  };

  const [isUploading, setIsUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Set logo URL when settings load
  useEffect(() => {
    if (settings?.logo_url) {
      setLogoUrl(settings.logo_url);
    }
  }, [settings?.logo_url]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Fehler", description: "Datei ist zu groß (max. 2MB)", variant: "destructive" });
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Fehler", description: "Nur PNG, JPG oder WebP erlaubt", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      // Create file path with user ID for RLS
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = logoUrl.split('/logos/')[1];
        if (oldPath) {
          await supabase.storage.from('logos').remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

      // Save URL to business settings
      if (settings) {
        await supabase
          .from('business_settings')
          .update({ logo_url: publicUrl })
          .eq('id', settings.id);
      } else {
        await supabase.from('business_settings').upsert({
          id: user.id,
          user_id: user.id,
          logo_url: publicUrl,
        }, { onConflict: "id" });
      }

      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      toast({ title: "Erfolg", description: "Logo wurde hochgeladen." });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Fehler", description: "Logo konnte nicht hochgeladen werden.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl || !user?.id) return;

    try {
      const filePath = logoUrl.split('/logos/')[1];
      if (filePath) {
        await supabase.storage.from('logos').remove([filePath]);
      }

      if (settings) {
        await supabase
          .from('business_settings')
          .update({ logo_url: null })
          .eq('id', settings.id);
      }

      setLogoUrl(null);
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      toast({ title: "Erfolg", description: "Logo wurde entfernt." });
    } catch (error) {
      toast({ title: "Fehler", description: "Logo konnte nicht entfernt werden.", variant: "destructive" });
    }
  };

  const handleColorChange = (color: string) => {
    setFormData({ ...formData, primary_color: color });
    // Apply color to CSS custom property for live preview
    document.documentElement.style.setProperty("--primary", color);
  };

  const handleGoogleCalendarConnect = () => {
    toast({
      title: "Google Kalender",
      description: "Diese Funktion wird in einer zukünftigen Version verfügbar sein.",
    });
  };

  // Business hours state
  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultHours);
  const [savingHours, setSavingHours] = useState(false);

  // Fetch profile with business hours
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Load business hours from profile
  useEffect(() => {
    if (profile?.business_hours) {
      setBusinessHours(profile.business_hours as unknown as BusinessHours);
    }
  }, [profile]);

  const handleSaveBusinessHours = async () => {
    if (!user?.id) return;
    setSavingHours(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ business_hours: JSON.parse(JSON.stringify(businessHours)) })
        .eq("id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Gespeichert", description: "Arbeitszeiten wurden aktualisiert." });
    } catch (error) {
      toast({ title: "Fehler", description: "Arbeitszeiten konnten nicht gespeichert werden.", variant: "destructive" });
    } finally {
      setSavingHours(false);
    }
  };

  const isProfileIncomplete = formData.subdomain && !formData.impressum_text?.trim();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">Management <HelpTip id="einstellungen.geschaeftsname" /></h1>
        <p className="text-muted-foreground mt-1">
          Abonnement, Rechnungen & Verträge
        </p>
      </div>

      {/* Gatekeeper Warning */}
      {isProfileIncomplete && (
        <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-400">Profil ist offline</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            Ihre öffentliche Landingpage ist nicht sichtbar, da das Impressum fehlt. 
            Bitte hinterlegen Sie Ihr Impressum im Tab "Rechtliches".
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid w-full max-w-5xl grid-cols-10">
          <TabsTrigger value="business" className="gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Geschäft</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Abo</span>
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Zeiten</span>
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Erinnerungen</span>
          </TabsTrigger>
          <TabsTrigger value="landing" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Landing</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Bewertungen</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2 relative">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Rechtliches</span>
            {isProfileIncomplete && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Zahlung</span>
          </TabsTrigger>
          <TabsTrigger value="app" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">App</span>
          </TabsTrigger>
          <TabsTrigger value="b2b-management" className="gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Management</span>
          </TabsTrigger>
        </TabsList>

        {/* Reviews Management Tab */}
        <TabsContent value="reviews" className="mt-6">
          <ReviewsManagement />
        </TabsContent>

        {/* Business Info */}
        <TabsContent value="business" className="mt-6 space-y-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Geschäftsinformationen</CardTitle>
              <CardDescription>
                Grundlegende Daten Ihres Hufbearbeiter-Geschäfts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  {logoUrl ? (
                    <div className="relative">
                      <Avatar className="w-24 h-24 rounded-xl">
                        <AvatarImage src={logoUrl} alt="Logo" className="object-cover" />
                        <AvatarFallback className="rounded-xl">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleRemoveLogo}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoUpload}
                  />
                  <Button 
                    variant="outline" 
                    className="mb-2" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Wird hochgeladen...
                      </>
                    ) : (
                      "Logo hochladen"
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground">PNG, JPG oder WebP, max. 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Geschäftsname</Label>
                  <Input
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inhaber</Label>
                  <Input
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Steuernummer</Label>
                <Input
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                />
              </div>

              <div className="flex justify-end">
                <Button className="gap-2" onClick={handleSave} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Company Location Card */}
          {user && profile && (
            <CompanyLocationCard
              userId={user.id}
              stableStreet={profile.stable_street}
              stableZip={profile.stable_zip}
              stableCity={profile.stable_city}
              stableLatitude={profile.stable_latitude}
              stableLongitude={profile.stable_longitude}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ["profile", user.id] })}
            />
          )}

          {/* Google Calendar Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Kalender-Integration
              </CardTitle>
              <CardDescription>
                Verbinden Sie Ihren Google Kalender für die Terminsynchonisierung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleGoogleCalendarConnect}>
                Google Kalender verbinden
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription / Mein Abo */}
        <TabsContent value="subscription" className="mt-6">
          <SubscriptionCard />
        </TabsContent>

        {/* Arbeitszeiten / Business Hours */}
        <TabsContent value="hours" className="mt-6 space-y-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Meine Arbeitszeiten
              </CardTitle>
              <CardDescription>
                Definieren Sie Ihre Verfügbarkeit. Außerhalb dieser Zeiten werden Kundenanfragen 
                zurückgehalten und Sie erhalten keine Benachrichtigungen (Feierabend-Modus).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <BusinessHoursEditor
                value={businessHours}
                onChange={setBusinessHours}
              />

              <div className="flex justify-end">
                <Button className="gap-2" onClick={handleSaveBusinessHours} disabled={savingHours}>
                  <Save className="h-4 w-4" />
                  {savingHours ? "Speichern..." : "Arbeitszeiten speichern"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reminders / Termin-Kommunikation */}
        <TabsContent value="reminders" className="mt-6 space-y-6">
          <ReminderSettingsCard />
        </TabsContent>

        {/* Landingpage */}
        <TabsContent value="landing" className="mt-6 space-y-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Landingpage-Einstellungen
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground hover:text-[#F47B20] cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>Deine digitale Visitenkarte. Hier gestaltest du die Seite, die deine Kunden sehen, wenn sie dich online suchen oder Termine buchen.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                Konfigurieren Sie Ihre öffentliche Landingpage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subdomain</Label>
                  <div className="flex">
                    <Input
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                      className="rounded-r-none"
                    />
                    <span className="px-3 py-2 bg-muted border border-l-0 border-border rounded-r-lg text-muted-foreground">
                      .hufmanager.de
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Eigene Domain (optional)</Label>
                  <Input
                    placeholder="www.ihre-domain.de"
                    value={formData.custom_domain}
                    onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hero-Überschrift</Label>
                <Input
                  value={formData.hero_headline}
                  onChange={(e) => setFormData({ ...formData, hero_headline: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Über mich</Label>
                <Textarea
                  rows={4}
                  value={formData.about_text}
                  onChange={(e) => setFormData({ ...formData, about_text: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Neue Kunden akzeptieren</p>
                  <p className="text-sm text-muted-foreground">Kontaktformular auf der Landingpage anzeigen</p>
                </div>
                <Switch
                  checked={formData.accept_new_customers}
                  onCheckedChange={(checked) => setFormData({ ...formData, accept_new_customers: checked })}
                />
              </div>

              <div className="flex justify-end gap-3">
                {formData.subdomain && (
                  <Button 
                    variant="outline" 
                    className="gap-2" 
                    onClick={() => window.open(`/p/${formData.subdomain}`, '_blank')}
                  >
                    <Globe className="h-4 w-4" />
                    Vorschau ansehen
                  </Button>
                )}
                <Button className="gap-2" onClick={handleSave} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section Manager - Drag & Drop Order */}
          <SectionManager />

          {/* Services Editor */}
          <LandingServicesEditor />

          {/* Gallery Manager */}
          <GalleryManager />
        </TabsContent>

        {/* Legal / Rechtliches */}
        <TabsContent value="legal" className="mt-6 space-y-6">
          {/* AVV Signing Card */}
          <AVVSigningCard />

          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Rechtliches
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground hover:text-[#F47B20] cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>Rechtssicherheit für deine Dokumente. Hinterlege hier AGB, Steuernummer und Impressum. Diese Daten erscheinen automatisch im Fußbereich jeder Rechnung und auf deiner Landingpage.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                Gesetzlich vorgeschriebene Angaben für Ihre Webseite. Ohne Impressum bleibt Ihr Profil offline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!formData.impressum_text?.trim() && (
                <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700 dark:text-orange-300">
                    Pflichtfeld: Bitte hinterlegen Sie Ihr Impressum, damit Ihre Landingpage öffentlich sichtbar wird.
                  </AlertDescription>
                </Alert>
              )}
              <Textarea
                rows={12}
                placeholder={`Beispiel:

Max Mustermann
Musterstraße 1
12345 Musterstadt

Telefon: 0123 456789
E-Mail: info@beispiel.de

Steuernummer: 12/345/67890
...`}
                value={formData.impressum_text}
                onChange={(e) => setFormData({ ...formData, impressum_text: e.target.value })}
                className="font-mono text-sm"
              />
              <div className="flex justify-end">
                <Button className="gap-2" onClick={handleSaveLegal} disabled={saveLegalMutation.isPending}>
                  <Save className="h-4 w-4" />
                  {saveLegalMutation.isPending ? "Speichern..." : "Impressum speichern"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AGB & Datenschutz
              </CardTitle>
              <CardDescription>
                Allgemeine Geschäftsbedingungen und Datenschutzerklärung (optional, aber empfohlen)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                rows={12}
                placeholder="Fügen Sie hier Ihre AGB und Datenschutzerklärung ein..."
                value={formData.terms_text}
                onChange={(e) => setFormData({ ...formData, terms_text: e.target.value })}
                className="font-mono text-sm"
              />
              <div className="flex justify-end">
                <Button className="gap-2" onClick={handleSaveLegal} disabled={saveLegalMutation.isPending}>
                  <Save className="h-4 w-4" />
                  {saveLegalMutation.isPending ? "Speichern..." : "AGB speichern"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* DSGVO: Datenexport (Art. 15/20) */}
          <DataExportSection />

          {/* DSGVO: Account löschen (Art. 17) */}
          <DeleteProviderAccountSection />
        </TabsContent>

        {/* Payment */}
        <TabsContent value="payment" className="mt-6 space-y-6">
          {/* New Payment Settings Card */}
          <PaymentSettingsCard />

          {/* Existing Payment Integrations */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Weitere Zahlungsanbieter
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground hover:text-[#F47B20] cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p>Zusätzliche Zahlungsanbieter für verschiedene Zahlungsmethoden.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                Weitere Zahlungsanbieter-Integrationen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Stripe Public Key</Label>
                <Input
                  placeholder="pk_live_..."
                  type="password"
                  value={formData.stripe_public_key}
                  onChange={(e) => setFormData({ ...formData, stripe_public_key: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>PayPal.me Link</Label>
                <Input
                  placeholder="paypal.me/IhrName"
                  value={formData.paypal_link}
                  onChange={(e) => setFormData({ ...formData, paypal_link: e.target.value })}
                />
              </div>

              <div className="flex justify-end">
                <Button className="gap-2 bg-[#F47B20] hover:bg-[#F47B20]/90" onClick={handleSave} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* App Settings Tab */}
        <TabsContent value="app" className="mt-6 space-y-6">
          <CommunicationSettingsCard />
          <AppSettingsCard />
          <KiSettingsCard />
          <TutorialSettingsCard />
        </TabsContent>

        {/* B2B Management Tab */}
        <TabsContent value="b2b-management" className="mt-6">
          <ManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Management;
