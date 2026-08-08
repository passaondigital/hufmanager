import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listHorsesTool from "./tools/list-horses";
import getHorseTool from "./tools/get-horse";
import listAppointmentsTool from "./tools/list-appointments";
import listInvoicesTool from "./tools/list-invoices";

// Issuer must be the direct Supabase host, built from the project ref literal.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "hufmanager",
  title: "HufManager",
  version: "0.1.0",
  instructions:
    "Tools für HufManager, die Management-App für mobile Pferdeprofis. Zugriff erfolgt als angemeldeter Nutzer: Pferde suchen und Details abrufen (list_horses, get_horse), Termine im Kalender einsehen (list_appointments) und Rechnungsstatus prüfen (list_invoices).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listHorsesTool, getHorseTool, listAppointmentsTool, listInvoicesTool],
});