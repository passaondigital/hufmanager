import { useAuth } from "@/hooks/useAuth";
import Marketplace from "@/pages/Marketplace";

/**
 * Public marketplace wrapper for markt.hufiapp.de subdomain.
 * Browse without login, login required for ordering.
 */
export default function MarketplacePublic() {
  // Marketplace component already handles auth internally for orders
  return <Marketplace />;
}
