export type ConnectionState = "online" | "offline";

type NavigatorLike = Pick<Navigator, "onLine">;

/** Browser connectivity is a transport hint, not proof that a provider is reachable. */
export function getConnectionState(navigatorLike?: NavigatorLike): ConnectionState {
  const browserNavigator = navigatorLike ?? (typeof navigator === "undefined" ? undefined : navigator);
  return browserNavigator?.onLine === false ? "offline" : "online";
}

export function subscribeToConnectionState(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
