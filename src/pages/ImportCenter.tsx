import { lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Link2,
  Contact,
  FileSpreadsheet,
  Wand2,
} from "lucide-react";

const MagicLinkSection = lazy(() => import("@/components/import/MagicLinkSection"));
const ContactPickerSection = lazy(() => import("@/components/import/ContactPickerSection"));
const UniversalImportSection = lazy(() => import("@/components/import/UniversalImportSection"));
const ImportWizard = lazy(() => import("@/components/import/ImportWizard"));

function ImportTabFallback() {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        Import-Modul wird geladen...
      </CardContent>
    </Card>
  );
}

const ImportCenter = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Center</h1>
        <p className="text-muted-foreground mt-1">
          Kontakte aus verschiedenen Quellen importieren und kategorisieren
        </p>
      </div>

      {/* Category Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-sm">Kunden</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-sm">Partner (Tierärzte/Schmiede)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-sm">Lieferanten</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-500" />
              <span className="text-sm">Leads/Interessenten</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Methods */}
      <Tabs defaultValue="wizard" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="wizard" className="gap-2">
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Assistent</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Direkt</span>
          </TabsTrigger>
          <TabsTrigger value="magic-link" className="gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Magic Link</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Contact className="h-4 w-4" />
            <span className="hidden sm:inline">Telefonbuch</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wizard">
          <Card>
            <CardContent className="pt-6">
              <Suspense fallback={<ImportTabFallback />}>
                <ImportWizard />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Suspense fallback={<ImportTabFallback />}>
            <UniversalImportSection />
          </Suspense>
        </TabsContent>

        <TabsContent value="magic-link">
          <Suspense fallback={<ImportTabFallback />}>
            <MagicLinkSection />
          </Suspense>
        </TabsContent>

        <TabsContent value="contacts">
          <Suspense fallback={<ImportTabFallback />}>
            <ContactPickerSection />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImportCenter;
