import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link2,
  MessageCircle,
  Contact,
  FileSpreadsheet,
  Copy,
  Share2,
  Check,
  RefreshCw,
  Upload,
  Users,
  Briefcase,
  Truck,
  UserPlus,
} from "lucide-react";
import MagicLinkSection from "@/components/import/MagicLinkSection";
import ContactPickerSection from "@/components/import/ContactPickerSection";
import UniversalImportSection from "@/components/import/UniversalImportSection";

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
      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="import" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Datenimport</span>
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

        <TabsContent value="import">
          <UniversalImportSection />
        </TabsContent>

        <TabsContent value="magic-link">
          <MagicLinkSection />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactPickerSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImportCenter;
