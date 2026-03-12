import { ClientBottomNav } from "@/components/client/ClientBottomNav";
import { ServiceOrderList } from "@/components/client/ServiceOrderList";

export default function ClientOrders() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <h1 className="text-2xl font-bold">Meine Aufträge</h1>
        <ServiceOrderList />
      </main>
      <ClientBottomNav />
    </div>
  );
}
