import { HufManagerSlimShell } from "@/components/slim/HufManagerSlimShell";

/**
 * Legacy provider specialist routes keep their existing paths and functionality,
 * but render inside the same HufManager Hybrid shell as the Slim workspace.
 * Client, partner, employee and admin layouts remain separate in App.tsx.
 */
export const AppLayout = () => <HufManagerSlimShell />;
