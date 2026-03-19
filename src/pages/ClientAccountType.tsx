import { ClientModeSettings } from "@/components/client/ClientModeSettings";

export default function ClientAccountTypePage() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 lg:pb-8">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Account-Typ</h1>
      <ClientModeSettings variant="settings" />
    </div>
  );
}
