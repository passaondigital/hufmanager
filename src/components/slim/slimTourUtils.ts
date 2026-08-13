export type SlimTourStopLike = {
  status?: string | null;
  client?: {
    geo_lat?: number | null;
    geo_lng?: number | null;
  } | null;
};

export function getSlimTourStats(stops: SlimTourStopLike[]) {
  const completedStops = stops.filter((stop) => stop.status === "completed").length;
  const geocodedStops = stops.filter((stop) => hasStopCoordinates(stop)).length;

  return {
    totalStops: stops.length,
    completedStops,
    openStops: Math.max(stops.length - completedStops, 0),
    geocodedStops,
    missingGeoStops: Math.max(stops.length - geocodedStops, 0),
  };
}

export function hasStopCoordinates(stop: SlimTourStopLike) {
  return typeof stop.client?.geo_lat === "number" && typeof stop.client?.geo_lng === "number";
}

export function buildGoogleMapsRouteUrl(stops: SlimTourStopLike[]) {
  const coordinates = stops
    .filter(hasStopCoordinates)
    .map((stop) => `${stop.client!.geo_lat},${stop.client!.geo_lng}`);

  if (coordinates.length === 0) return null;

  const destination = coordinates[coordinates.length - 1];
  const waypoints = coordinates.slice(0, -1);
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    destination,
  });

  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export type SlimTourCostInput = {
  routeDistanceKm?: number | null;
  vehiclePricePerKm?: number | null;
  businessTravelCostPerKm?: number | null;
  businessTravelCostFlat?: number | null;
  vehicleTravelCostFlat?: number | null;
  fuelCost?: number | null;
};

export function calculateSlimTourCosts(input: SlimTourCostInput) {
  const routeDistanceKm = input.routeDistanceKm ?? 0;
  const operatingCost =
    input.fuelCost != null
      ? input.fuelCost
      : input.vehiclePricePerKm != null
        ? routeDistanceKm * input.vehiclePricePerKm
        : null;

  const customerTravelCharge =
    input.businessTravelCostFlat != null
      ? input.businessTravelCostFlat
      : input.vehicleTravelCostFlat != null
        ? input.vehicleTravelCostFlat
        : input.businessTravelCostPerKm != null
          ? routeDistanceKm * input.businessTravelCostPerKm
          : null;

  return {
    operatingCost: operatingCost == null ? null : Math.round(operatingCost * 100) / 100,
    customerTravelCharge: customerTravelCharge == null ? null : Math.round(customerTravelCharge * 100) / 100,
  };
}

export function calculateActualOdometerDistance(startKm?: number | null, endKm?: number | null) {
  if (startKm == null || endKm == null) {
    return { status: "incomplete" as const, distanceKm: null, error: null };
  }

  if (endKm < startKm) {
    return { status: "invalid" as const, distanceKm: null, error: "END_BEFORE_START" as const };
  }

  return { status: "complete" as const, distanceKm: Math.round((endKm - startKm) * 10) / 10, error: null };
}
