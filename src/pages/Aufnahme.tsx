import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, PlusCircle, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const Aufnahme = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aufnahme</h1>
        <p className="text-muted-foreground mt-1">
          Neue Kunden und Pferde anlegen, KundenApp-Einladungen versenden
        </p>
      </div>

      <Tabs defaultValue="kunde" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="kunde" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Neuer Kunde
          </TabsTrigger>
          <TabsTrigger value="pferd" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Neues Pferd
          </TabsTrigger>
          <TabsTrigger value="einladung" className="gap-2">
            <Send className="h-4 w-4" />
            Einladung
          </TabsTrigger>
        </TabsList>

        {/* Neuer Kunde */}
        <TabsContent value="kunde" className="mt-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Neuen Kunden anlegen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input id="firstName" placeholder="Max" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input id="lastName" placeholder="Mustermann" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input id="email" type="email" placeholder="max@beispiel.de" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input id="phone" type="tel" placeholder="+49 171 1234567" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" placeholder="Straße, PLZ Ort" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea id="notes" placeholder="Zusätzliche Informationen..." rows={3} />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline">Abbrechen</Button>
                <Button>Kunde anlegen</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Neues Pferd */}
        <TabsContent value="pferd" className="mt-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Neues Pferd anlegen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customer">Kunde auswählen *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kid1">Anna Schmidt (#Kid000001)</SelectItem>
                    <SelectItem value="kid2">Thomas Müller (#Kid000002)</SelectItem>
                    <SelectItem value="kid3">Maria Weber (#Kid000003)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horseName">Name des Pferdes *</Label>
                  <Input id="horseName" placeholder="Bella" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breed">Rasse</Label>
                  <Input id="breed" placeholder="Warmblut" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthYear">Geburtsjahr</Label>
                  <Input id="birthYear" type="number" placeholder="2015" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Geschlecht</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stute">Stute</SelectItem>
                      <SelectItem value="wallach">Wallach</SelectItem>
                      <SelectItem value="hengst">Hengst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Farbe</Label>
                  <Input id="color" placeholder="Braun" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hoofType">Huftyp</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barhuf">Barhuf</SelectItem>
                      <SelectItem value="beschlag">Beschlag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Beschlagsintervall (Wochen)</Label>
                  <Input id="interval" type="number" placeholder="6" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="horseNotes">Besondere Hinweise</Label>
                <Textarea id="horseNotes" placeholder="Allergien, Verhaltenshinweise, etc." rows={3} />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline">Abbrechen</Button>
                <Button>Pferd anlegen</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Einladung */}
        <TabsContent value="einladung" className="mt-6">
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>KundenApp-Einladung versenden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="inviteCustomer">Kunde auswählen *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kid1">Anna Schmidt (#Kid000001)</SelectItem>
                    <SelectItem value="kid2">Thomas Müller (#Kid000002)</SelectItem>
                    <SelectItem value="kid3">Maria Weber (#Kid000003)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inviteMethod">Versandmethode *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Methode auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">E-Mail</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="qr">QR-Code generieren</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Der Kunde erhält eine Einladung mit seinen Zugangsdaten (KID + PIN) zur KundenApp.
                  Dort kann er seine Pferdedaten, Termine und Rechnungen einsehen.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline">Abbrechen</Button>
                <Button className="gap-2">
                  <Send className="h-4 w-4" />
                  Einladung senden
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Aufnahme;
