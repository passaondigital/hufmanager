import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Phone,
  Mail,
  Briefcase,
  Truck,
  Building,
  MoreHorizontal,
  Trash2,
  Edit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Netzwerk = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("partner");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("provider_id", user.id)
        .in("category", ["partner", "supplier"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Kontakt gelöscht" });
    },
    onError: () => {
      toast({ title: "Fehler", variant: "destructive" });
    },
  });

  const partners = contacts.filter((c) => c.category === "partner");
  const suppliers = contacts.filter((c) => c.category === "supplier");

  const filteredContacts = (activeTab === "partner" ? partners : suppliers).filter(
    (c) =>
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ContactCard = ({ contact }: { contact: any }) => (
    <Card className="hover:shadow-lg transition-all group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {contact.full_name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("") || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{contact.full_name}</h3>
              <Badge
                variant="secondary"
                className={
                  contact.category === "partner"
                    ? "bg-blue-500/10 text-blue-600"
                    : "bg-amber-500/10 text-amber-600"
                }
              >
                {contact.category === "partner" ? "Partner" : "Lieferant"}
              </Badge>
            </div>

            {contact.company_name && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <Building className="h-3.5 w-3.5" />
                {contact.company_name}
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone}
                </a>
              )}
            </div>

            {contact.notes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {contact.notes}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => deleteMutation.mutate(contact.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Netzwerk</h1>
          <p className="text-muted-foreground mt-1">
            {partners.length} Partner • {suppliers.length} Lieferanten
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/management/import")}>
          <Plus className="h-4 w-4" />
          Kontakt importieren
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="partner" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Partner ({partners.length})
          </TabsTrigger>
          <TabsTrigger value="supplier" className="gap-2">
            <Truck className="h-4 w-4" />
            Lieferanten ({suppliers.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kontakt suchen..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="partner" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filteredContacts.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="p-8 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Keine Partner gefunden.</p>
                  <Button className="mt-4" onClick={() => navigate("/management/import")}>
                    Partner importieren
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredContacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="supplier" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filteredContacts.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="p-8 text-center">
                  <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Keine Lieferanten gefunden.</p>
                  <Button className="mt-4" onClick={() => navigate("/management/import")}>
                    Lieferanten importieren
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredContacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Netzwerk;
