import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface EditorSection {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  locked?: boolean;
}

export const ALL_SECTIONS: EditorSection[] = [
  { id: "hero", label: "Hero / Header", icon: "🏠", enabled: true, locked: true },
  { id: "trust_counters", label: "Vertrauens-Zähler", icon: "📊", enabled: false },
  { id: "about", label: "Über mich", icon: "👤", enabled: true },
  { id: "highlights", label: "Leistungen (Karten)", icon: "⭐", enabled: true },
  { id: "services", label: "Service-Liste", icon: "📋", enabled: true },
  { id: "list_items", label: "Preisliste", icon: "💰", enabled: false },
  { id: "gallery", label: "Galerie", icon: "🖼", enabled: true },
  { id: "before_after", label: "Vorher / Nachher", icon: "🔄", enabled: false },
  { id: "instagram", label: "Instagram Feed", icon: "📸", enabled: false },
  { id: "reviews", label: "Bewertungen", icon: "⭐", enabled: true },
  { id: "faq", label: "FAQ", icon: "❓", enabled: false },
  { id: "service_area", label: "Einzugsgebiet", icon: "📍", enabled: false },
  { id: "qualifications", label: "Qualifikationen", icon: "🎓", enabled: false },
  { id: "shop_grid", label: "Shop / Produkte", icon: "🛍", enabled: false },
  { id: "contact", label: "Kontakt", icon: "📞", enabled: true, locked: true },
];

export interface EditorSettings {
  business_name: string;
  owner_name: string;
  hero_headline: string;
  hero_image_url: string;
  about_text: string;
  logo_url: string;
  primary_color: string;
  phone: string;
  address: string;
  subdomain: string;
  meta_description: string;
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
  social_website: string;
  whatsapp_enabled: boolean;
  whatsapp_number: string;
  exit_intent_enabled: boolean;
  accept_new_customers: boolean;
  client_intake_status: string;
  landing_template: string;
  reviews_layout: string;
  service_area_text: string;
  service_area_km: number;
  horses_treated: number;
  years_experience: number;
  qualifications: { title: string; year: string; institution?: string }[];
  gallery_images: { url: string; caption?: string }[];
  instagram_posts: { image_url: string; caption?: string; post_url?: string }[];
}

const DEFAULT_SETTINGS: EditorSettings = {
  business_name: "",
  owner_name: "",
  hero_headline: "",
  hero_image_url: "",
  about_text: "",
  logo_url: "",
  primary_color: "#F5970A",
  phone: "",
  address: "",
  subdomain: "",
  meta_description: "",
  social_instagram: "",
  social_facebook: "",
  social_tiktok: "",
  social_website: "",
  whatsapp_enabled: false,
  whatsapp_number: "",
  exit_intent_enabled: false,
  accept_new_customers: true,
  client_intake_status: "open",
  landing_template: "classic",
  reviews_layout: "grid",
  service_area_text: "",
  service_area_km: 50,
  horses_treated: 0,
  years_experience: 0,
  qualifications: [],
  gallery_images: [],
  instagram_posts: [],
};

export function useWebsiteEditor() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<EditorSection[]>(ALL_SECTIONS);
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ["landing-editor-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Initialize from DB
  useEffect(() => {
    if (!dbSettings) return;
    const s = dbSettings as any;
    setSettings({
      business_name: s.business_name || "",
      owner_name: s.owner_name || "",
      hero_headline: s.hero_headline || "",
      hero_image_url: s.hero_image_url || "",
      about_text: s.about_text || "",
      logo_url: s.logo_url || "",
      primary_color: s.primary_color || "#F5970A",
      phone: s.phone || "",
      address: s.address || "",
      subdomain: s.subdomain || "",
      meta_description: s.meta_description || "",
      social_instagram: s.social_instagram || "",
      social_facebook: s.social_facebook || "",
      social_tiktok: s.social_tiktok || "",
      social_website: s.social_website || "",
      whatsapp_enabled: s.whatsapp_enabled || false,
      whatsapp_number: s.whatsapp_number || "",
      exit_intent_enabled: s.exit_intent_enabled || false,
      accept_new_customers: s.accept_new_customers ?? true,
      client_intake_status: s.client_intake_status || "open",
      landing_template: s.landing_template || "classic",
      reviews_layout: s.reviews_layout || "grid",
      service_area_text: s.service_area_text || "",
      service_area_km: s.service_area_km || 50,
      horses_treated: s.horses_treated || 0,
      years_experience: s.years_experience || 0,
      qualifications: Array.isArray(s.qualifications) ? s.qualifications : [],
      gallery_images: Array.isArray(s.gallery_images) ? s.gallery_images : [],
      instagram_posts: Array.isArray(s.instagram_posts) ? s.instagram_posts : [],
    });

    // Restore section order
    if (Array.isArray(s.section_order) && s.section_order.length > 0) {
      const enabledIds = s.section_order as string[];
      const ordered: EditorSection[] = [];
      enabledIds.forEach((id) => {
        const def = ALL_SECTIONS.find((sec) => sec.id === id);
        if (def) ordered.push({ ...def, enabled: true });
      });
      ALL_SECTIONS.forEach((def) => {
        if (!ordered.find((s) => s.id === def.id)) {
          ordered.push({ ...def, enabled: false });
        }
      });
      setSections(ordered);
    }
  }, [dbSettings]);

  const updateSetting = useCallback(<K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const enabledOrder = sections.filter((s) => s.enabled).map((s) => s.id);
      const { error } = await supabase
        .from("business_settings")
        .update({
          business_name: settings.business_name || null,
          owner_name: settings.owner_name || null,
          hero_headline: settings.hero_headline || null,
          hero_image_url: settings.hero_image_url || null,
          about_text: settings.about_text || null,
          logo_url: settings.logo_url || null,
          primary_color: settings.primary_color || null,
          phone: settings.phone || null,
          address: settings.address || null,
          meta_description: settings.meta_description || null,
          social_instagram: settings.social_instagram || null,
          social_facebook: settings.social_facebook || null,
          social_tiktok: settings.social_tiktok || null,
          social_website: settings.social_website || null,
          whatsapp_enabled: settings.whatsapp_enabled,
          whatsapp_number: settings.whatsapp_number || null,
          exit_intent_enabled: settings.exit_intent_enabled,
          accept_new_customers: settings.accept_new_customers,
          client_intake_status: settings.client_intake_status || null,
          landing_template: settings.landing_template || null,
          reviews_layout: settings.reviews_layout || null,
          service_area_text: settings.service_area_text || null,
          service_area_km: settings.service_area_km || null,
          horses_treated: settings.horses_treated || null,
          years_experience: settings.years_experience || null,
          qualifications: settings.qualifications.length > 0 ? settings.qualifications : null,
          gallery_images: settings.gallery_images.length > 0 ? settings.gallery_images : null,
          instagram_posts: settings.instagram_posts.length > 0 ? settings.instagram_posts : null,
          section_order: enabledOrder,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setHasChanges(false);
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["landing-editor-settings"] });
    },
    onError: () => {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    },
  });

  // Auto-save with debounce
  useEffect(() => {
    if (!hasChanges) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveMutation.mutate();
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [hasChanges, settings, sections]);

  const save = useCallback(() => {
    saveMutation.mutate();
    toast({ title: "💾 Gespeichert" });
  }, [saveMutation]);

  const toggleSection = useCallback((sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId && !s.locked ? { ...s, enabled: !s.enabled } : s))
    );
    setHasChanges(true);
  }, []);

  const reorderSections = useCallback((newSections: EditorSection[]) => {
    setSections(newSections);
    setHasChanges(true);
  }, []);

  const websiteUrl = settings.subdomain ? `${window.location.origin}/p/${settings.subdomain}` : null;

  return {
    sections,
    settings,
    isLoading,
    hasChanges,
    lastSaved,
    activeSection,
    setActiveSection,
    updateSetting,
    save,
    isSaving: saveMutation.isPending,
    toggleSection,
    reorderSections,
    websiteUrl,
  };
}
