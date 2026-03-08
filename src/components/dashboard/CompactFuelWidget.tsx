import { useFuelPrices, getCheapestPrice } from "@/hooks/useFuelPrices";
import { Fuel } from "lucide-react";
import { useState, useEffect } from "react";

export function CompactFuelWidget() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  const { data } = useFuelPrices({
    lat: coords?.lat,
    lng: coords?.lng,
    rad: 5,
    enabled: !!coords,
  });

  const stations = data?.stations || [];
  const diesel = getCheapestPrice(stations, "diesel");
  const e5 = getCheapestPrice(stations, "e5");
  const e10 = getCheapestPrice(stations, "e10");

  if (!diesel.price && !e5.price && !e10.price) return null;

  const stationName = diesel.station?.brand || diesel.station?.name || "–";
  const stationPlace = diesel.station?.place || "";
  const dist = diesel.station?.dist?.toFixed(1) || "–";

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs">
        <Fuel className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">
          Diesel{" "}
          <span className="font-bold text-foreground">{diesel.price?.toFixed(3) || "–"}</span>
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span className="text-muted-foreground">
          E5{" "}
          <span className="font-bold text-foreground">{e5.price?.toFixed(3) || "–"}</span>
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span className="text-muted-foreground">
          E10{" "}
          <span className="font-bold text-foreground">{e10.price?.toFixed(3) || "–"}</span>
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 truncate">
        {stationName} · {stationPlace} · {dist} km
      </p>
    </div>
  );
}
