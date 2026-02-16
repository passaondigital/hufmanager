import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Receipt, Scale, Share2, Archive } from "lucide-react";
import { EuerOverview } from "@/components/buchhaltung/EuerOverview";
import { UStVoranmeldung } from "@/components/buchhaltung/UStVoranmeldung";
import { ExportCenter } from "@/components/buchhaltung/ExportCenter";
import { SteuerberaterAccess } from "@/components/buchhaltung/SteuerberaterAccess";
import { BelegArchiv } from "@/components/buchhaltung/BelegArchiv";

export default function Buchhaltung() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("euer");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Buchhaltung</h1>
        <p className="text-muted-foreground">
          Professionelle Buchhaltung – GoBD-konform, exportbereit, steuerberater-tauglich
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="euer" className="flex items-center gap-2 text-xs sm:text-sm py-2.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">EÜR</span>
            <span className="sm:hidden">EÜR</span>
          </TabsTrigger>
          <TabsTrigger value="ust" className="flex items-center gap-2 text-xs sm:text-sm py-2.5">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">USt-VA</span>
            <span className="sm:hidden">USt</span>
          </TabsTrigger>
          <TabsTrigger value="archiv" className="flex items-center gap-2 text-xs sm:text-sm py-2.5">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Belegarchiv</span>
            <span className="sm:hidden">Archiv</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2 text-xs sm:text-sm py-2.5">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </TabsTrigger>
          <TabsTrigger value="steuerberater" className="flex items-center gap-2 text-xs sm:text-sm py-2.5">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Steuerberater</span>
            <span className="sm:hidden">StB</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="euer" className="mt-6">
          <EuerOverview />
        </TabsContent>
        <TabsContent value="ust" className="mt-6">
          <UStVoranmeldung />
        </TabsContent>
        <TabsContent value="archiv" className="mt-6">
          <BelegArchiv />
        </TabsContent>
        <TabsContent value="export" className="mt-6">
          <ExportCenter />
        </TabsContent>
        <TabsContent value="steuerberater" className="mt-6">
          <SteuerberaterAccess />
        </TabsContent>
      </Tabs>
    </div>
  );
}
