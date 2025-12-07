import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Clock, Euro } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const categoryColors: Record<string, string> = {
  Standard: "bg-accent/10 text-accent",
  Beschlag: "bg-primary/10 text-primary",
  Spezial: "bg-amber-500/10 text-amber-600",
  Zubehör: "bg-muted text-muted-foreground",
};

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  base_price: number;
  duration: number | null;
  is_active: boolean | null;
}

const Services = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Standard",
    base_price: 0,
    duration: 60,
  });
  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("created_at");
      if (error) throw error;
      return data as Service[];
    },
  });

  const createService = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      
      const { error } = await supabase.from("services").insert({
        ...data,
        is_active: true,
        provider_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Erfolg", description: "Service wurde erstellt." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Fehler", description: "Service konnte nicht erstellt werden.", variant: "destructive" });
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Service> }) => {
      const { error } = await supabase.from("services").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Erfolg", description: "Service wurde aktualisiert." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Fehler", description: "Service konnte nicht aktualisiert werden.", variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const openCreateDialog = () => {
    setEditingService(null);
    setFormData({ name: "", description: "", category: "Standard", base_price: 0, duration: 60 });
    setIsDialogOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      category: service.category,
      base_price: service.base_price,
      duration: service.duration || 60,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingService(null);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast({ title: "Fehler", description: "Bitte geben Sie einen Namen ein.", variant: "destructive" });
      return;
    }
    if (editingService) {
      updateService.mutate({ id: editingService.id, data: formData });
    } else {
      createService.mutate(formData);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre angebotenen Dienstleistungen
          </p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Neuer Service
        </Button>
      </div>

      <div className="grid gap-4">
        {services.map((service, index) => (
          <Card
            key={service.id}
            className={cn("animate-slide-up", !service.is_active && "opacity-60")}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                    <Badge className={cn("font-medium", categoryColors[service.category])}>
                      {service.category}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">{service.description}</p>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <Euro className="h-4 w-4 text-primary" />
                      €{service.base_price}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      ca. {service.duration} Min.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Aktiv</span>
                    <Switch
                      checked={service.is_active ?? false}
                      onCheckedChange={(checked) =>
                        toggleActive.mutate({ id: service.id, is_active: checked })
                      }
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(service)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? "Service bearbeiten" : "Neuer Service"}</DialogTitle>
            <DialogDescription>
              {editingService ? "Bearbeiten Sie die Service-Details" : "Erstellen Sie einen neuen Service"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Service-Name"
              />
            </div>

            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Service-Beschreibung"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Beschlag">Beschlag</SelectItem>
                    <SelectItem value="Spezial">Spezial</SelectItem>
                    <SelectItem value="Zubehör">Zubehör</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preis (€)</Label>
                <Input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dauer (Minuten)</Label>
              <Input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={createService.isPending || updateService.isPending}>
              {editingService ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
