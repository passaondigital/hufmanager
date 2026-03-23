import { useOutletContext } from "react-router-dom";
import type { Organization } from "@/hooks/useOrganization";
import HMConnect from "@/pages/HMConnect";

export default function PortalConnect() {
  return <HMConnect />;
}
