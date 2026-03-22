import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Users, Zap, BookOpen } from "lucide-react";
import { CampaignsTab } from "./tabs/CampaignsTab";
import { LeadsTab } from "./tabs/LeadsTab";
import { AutoresponderTab } from "./tabs/AutoresponderTab";
import { ContactsTab } from "./tabs/ContactsTab";

export default function EmailMarketingPage() {
  const [activeTab, setActiveTab] = useState("campaigns");

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-black">E-Mail Marketing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Newsletter, Autoresponder & Lead-Generierung
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 pb-1">
            <TabsList className="bg-white shadow-sm rounded-xl p-1 h-auto inline-flex min-w-max">
              <TabsTrigger value="campaigns" className="gap-1.5 data-[state=active]:bg-[#F47B20] data-[state=active]:text-white min-h-[40px] text-xs sm:text-sm px-2.5 sm:px-3">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline">Kampagnen</span>
                <span className="xs:hidden">Mails</span>
              </TabsTrigger>
              <TabsTrigger value="leads" className="gap-1.5 data-[state=active]:bg-[#F47B20] data-[state=active]:text-white min-h-[40px] text-xs sm:text-sm px-2.5 sm:px-3">
                <Users className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline">Leads sammeln</span>
                <span className="xs:hidden">Leads</span>
              </TabsTrigger>
              <TabsTrigger value="autoresponder" className="gap-1.5 data-[state=active]:bg-[#F47B20] data-[state=active]:text-white min-h-[40px] text-xs sm:text-sm px-2.5 sm:px-3">
                <Zap className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Autoresponder</span>
                <span className="sm:hidden">Auto</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="gap-1.5 data-[state=active]:bg-[#F47B20] data-[state=active]:text-white min-h-[40px] text-xs sm:text-sm px-2.5 sm:px-3">
                <BookOpen className="w-4 h-4 shrink-0" />
                Kontakte
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
          <TabsContent value="leads"><LeadsTab /></TabsContent>
          <TabsContent value="autoresponder"><AutoresponderTab /></TabsContent>
          <TabsContent value="contacts"><ContactsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
