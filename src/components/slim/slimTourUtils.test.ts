import { describe, expect, it } from "vitest";
import { buildGoogleMapsRouteUrl, calculateActualOdometerDistance, calculateSlimTourCosts, getSlimTourStats, isTourStopFinished } from "./slimTourUtils";

describe("slimTourUtils", () => {
  it("counts completed, no-show and missing-geodata stops correctly", () => {
    expect(
      getSlimTourStats([
        { status: "completed", client: { geo_lat: 50.1, geo_lng: 7.1 } },
        { status: "no_show", client: { geo_lat: 50.15, geo_lng: 7.15 } },
        { status: "planned", client: { geo_lat: null, geo_lng: null } },
        { status: "confirmed", client: { geo_lat: 50.2, geo_lng: 7.2 } },
      ]),
    ).toEqual({
      totalStops: 4,
      completedStops: 1,
      openStops: 2,
      geocodedStops: 3,
      missingGeoStops: 1,
    });
  });

  it("treats completed, no-show and cancelled stops as finished", () => {
    expect(isTourStopFinished("completed")).toBe(true);
    expect(isTourStopFinished("no_show")).toBe(true);
    expect(isTourStopFinished("cancelled")).toBe(true);
    expect(isTourStopFinished("confirmed")).toBe(false);
  });

  it("builds Google Maps navigation only from open geocoded stops", () => {
    const url = buildGoogleMapsRouteUrl([
      { status: "completed", client: { geo_lat: 50.0, geo_lng: 7.0 } },
      { status: "confirmed", client: { geo_lat: 50.1, geo_lng: 7.1 } },
      { status: "planned", client: { geo_lat: null, geo_lng: null } },
      { status: "confirmed", client: { geo_lat: 50.2, geo_lng: 7.2 } },
    ]);

    expect(url).toContain("https://www.google.com/maps/dir/");
    expect(url).toContain("destination=50.2%2C7.2");
    expect(url).toContain("waypoints=50.1%2C7.1");
    expect(url).not.toContain("50.0%2C7.0");
  });

  it("returns null when no open stop has coordinates", () => {
    expect(buildGoogleMapsRouteUrl([{ status: "completed", client: { geo_lat: 50.1, geo_lng: 7.1 } }, { client: null }])).toBeNull();
  });

  it("keeps operating vehicle costs separate from customer travel charges", () => {
    expect(
      calculateSlimTourCosts({
        routeDistanceKm: 42,
        vehiclePricePerKm: 0.32,
        businessTravelCostPerKm: 0.55,
      }),
    ).toEqual({
      operatingCost: 13.44,
      customerTravelCharge: 23.1,
    });
  });

  it("prefers configured flat customer travel charges without overwriting internal costs", () => {
    expect(
      calculateSlimTourCosts({
        routeDistanceKm: 42,
        fuelCost: 9.876,
        businessTravelCostPerKm: 0.55,
        businessTravelCostFlat: 18,
      }),
    ).toEqual({
      operatingCost: 9.88,
      customerTravelCharge: 18,
    });
  });

  it("calculates actual odometer distance only from explicit start and end km", () => {
    expect(calculateActualOdometerDistance(100000, 100087)).toEqual({
      status: "complete",
      distanceKm: 87,
      error: null,
    });
  });

  it("rejects odometer end km lower than start km", () => {
    expect(calculateActualOdometerDistance(100087, 100000)).toEqual({
      status: "invalid",
      distanceKm: null,
      error: "END_BEFORE_START",
    });
  });

  it("keeps mileage incomplete without inventing actual distance", () => {
    expect(calculateActualOdometerDistance(null, null)).toEqual({
      status: "incomplete",
      distanceKm: null,
      error: null,
    });
  });
});
