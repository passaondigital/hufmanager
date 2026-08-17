import { describe, expect, it } from "vitest";
import {
  buildGoogleMapsRouteUrl,
  buildInsertionOrder,
  calculateActualOdometerDistance,
  calculateSlimTourCosts,
  getSlimTourStats,
  isTourStopFinished,
  isTourStopLockedForReplan,
  partitionStopsForReplan,
} from "./slimTourUtils";

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

  it("locks the current in-progress stop for replanning", () => {
    expect(isTourStopLockedForReplan("in_progress")).toBe(true);
    expect(isTourStopLockedForReplan("confirmed")).toBe(false);

    const stops = [
      { id: "done", status: "completed" },
      { id: "current", status: "in_progress" },
      { id: "later-a", status: "confirmed" },
      { id: "later-b", status: "planned" },
    ];

    expect(partitionStopsForReplan(stops)).toEqual({
      finished: [stops[0]],
      locked: [stops[1]],
      candidates: [stops[2], stops[3]],
    });
  });

  it("keeps multiple defensive in-progress rows pinned before future candidates", () => {
    const stops = [
      { id: "current-a", status: "in_progress" },
      { id: "future", status: "confirmed" },
      { id: "current-b", status: "in_progress" },
    ];

    expect(partitionStopsForReplan(stops)).toEqual({
      finished: [],
      locked: [stops[0], stops[2]],
      candidates: [stops[1]],
    });
  });

  it("inserts a new next stop after the current in-progress customer", () => {
    const stops = [
      { id: "done", status: "completed" },
      { id: "current", status: "in_progress" },
      { id: "later", status: "confirmed" },
      { id: "new", status: "planned" },
    ];

    expect(buildInsertionOrder(stops, new Set(["new"]), "next").map((stop) => stop.id)).toEqual([
      "done",
      "current",
      "new",
      "later",
    ]);
  });

  it("keeps a new end stop after the remaining route while current stop stays pinned", () => {
    const stops = [
      { id: "done", status: "completed" },
      { id: "current", status: "in_progress" },
      { id: "later", status: "confirmed" },
      { id: "new", status: "planned" },
    ];

    expect(buildInsertionOrder(stops, new Set(["new"]), "end").map((stop) => stop.id)).toEqual([
      "done",
      "current",
      "later",
      "new",
    ]);
  });

  it("never promotes a future stop ahead of the current one through insertion ordering", () => {
    const stops = [
      { id: "current", status: "in_progress" },
      { id: "new-a", status: "confirmed" },
      { id: "new-b", status: "planned" },
      { id: "later", status: "confirmed" },
    ];

    expect(buildInsertionOrder(stops, new Set(["new-a", "new-b"]), "next").map((stop) => stop.id)).toEqual([
      "current",
      "new-a",
      "new-b",
      "later",
    ]);
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
