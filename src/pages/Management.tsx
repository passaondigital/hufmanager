import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building,
  Globe,
  Palette,
  CreditCard,
  Upload,
  Save,
} from "lucide-react";

const Management = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Management</h1>
        <p className="text-muted-foreground mt-1">
          Geschäftsdaten und Landingpage-Konfiguration
        </p>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="business" className="gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Geschäft</span>
          </TabsTrigger>
          <TabsTrigger value="landing" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Landingpage</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Design</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Zahlung</span>
          </TabsTrigger>
        </TabsList>

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
                <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <Button variant="outline" className="mb-2">Logo hochladen</Button>
                  <p className="text-sm text-muted-foreground">PNG oder JPG, max. 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Geschäftsname</Label>
                  <Input defaultValue="Hufeisen Hufpflege" />
                </div>
                <div className="space-y-2">
                  <Label>Inhaber</Label>
                  <Input defaultValue="Max Hufeisen" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input type="email" defaultValue="info@hufeisen-hufpflege.de" />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input type="tel" defaultValue="+49 171 1234567" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input defaultValue="Hufweg 12, 85221 Dachau" />
              </div>

              <div className="space-y-2">
                <Label>Steuernummer</Label>
                <Input defaultValue="123/456/78901" />
              </div>

              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Landingpage */}
        <TabsContent value="landing" className="mt-6 space-y-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Landingpage-Einstellungen</CardTitle>
              <CardDescription>
                Konfigurieren Sie Ihre öffentliche Landingpage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subdomain</Label>
                  <div className="flex">
                    <Input defaultValue="hufeisen" className="rounded-r-none" />
                    <span className="px-3 py-2 bg-muted border border-l-0 border-border rounded-r-lg text-muted-foreground">
                      .hufmanager.de
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Eigene Domain (optional)</Label>
                  <Input placeholder="www.ihre-domain.de" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hero-Überschrift</Label>
                <Input defaultValue="Professionelle Hufpflege im Raum München" />
              </div>

              <div className="space-y-2">
                <Label>Über mich</Label>
                <Textarea
                  rows={4}
                  defaultValue="Mit über 15 Jahren Erfahrung in der Hufbearbeitung sorge ich für gesunde und glückliche Pferdehufe. Meine Philosophie: Jedes Pferd verdient individuelle Betreuung."
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Neue Kunden akzeptieren</p>
                  <p className="text-sm text-muted-foreground">Kontaktformular auf der Landingpage anzeigen</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme */}
        <TabsContent value="theme" className="mt-6 space-y-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Design-Einstellungen</CardTitle>
              <CardDescription>
                Passen Sie das Erscheinungsbild Ihrer Landingpage an
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Primärfarbe</Label>
                <div className="flex gap-3">
                  {["#d97706", "#059669", "#2563eb", "#7c3aed", "#dc2626"].map((color) => (
                    <button
                      key={color}
                      className="w-10 h-10 rounded-lg border-2 border-transparent hover:border-foreground/50 transition-colors"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <Input type="color" className="w-10 h-10 p-1 cursor-pointer" defaultValue="#d97706" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment */}
        <TabsContent value="payment" className="mt-6 space-y-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Zahlungslinks</CardTitle>
              <CardDescription>
                Verbinden Sie Ihre Zahlungsanbieter für einfache Rechnungsstellung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Stripe Public Key</Label>
                <Input placeholder="pk_live_..." type="password" />
              </div>

              <div className="space-y-2">
                <Label>CopeCart Vendor ID</Label>
                <Input placeholder="Ihre Vendor ID" />
              </div>

              <div className="space-y-2">
                <Label>PayPal.me Link</Label>
                <Input placeholder="paypal.me/IhrName" />
              </div>

              <div className="flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Management;
