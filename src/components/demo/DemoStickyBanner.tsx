import { useAuth } from "@/hooks/useAuth";
import { isDemoEmail } from "@/lib/demo-accounts";
import { DemoStickyBannerContent } from "./DemoStickyBannerContent";

export function DemoStickyBanner() {
  const { user } = useAuth();

  if (!isDemoEmail(user?.email)) {
    return null;
  }

  return <DemoStickyBannerContent />;
}
