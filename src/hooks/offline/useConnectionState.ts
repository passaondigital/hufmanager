import { useSyncExternalStore } from "react";
import { getConnectionState, subscribeToConnectionState, type ConnectionState } from "@/lib/offline/connectionState";

/** One SSR-safe source for browser online/offline events. */
export function useConnectionState(): ConnectionState {
  return useSyncExternalStore(subscribeToConnectionState, getConnectionState, () => "online");
}
