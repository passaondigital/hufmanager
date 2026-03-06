/**
 * Geocode an appointment using prioritized address sources:
 * 1. client_locations (most precise)
 * 2. location free-text field
 * 3. horse stable_address
 * 4. client profile stable_address
 */
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress } from "@/lib/geocode";

interface GeoResult {
  lat: number;
  lng: number;
  source: string;
}

/**
 * Resolve lat/lng for an appointment and persist to DB.
 * Returns coordinates or null if geocoding fails.
 */
export async function geocodeAppointmentAndSave(
  appointmentId: string,
  opts: {
    clientId?: string | null;
    horseId?: string | null;
    location?: string | null;
  }
): Promise<GeoResult | null> {
  const { clientId, horseId, location } = opts;

  // Priority 1: client_locations (stable locations)
  if (clientId) {
    const { data: clientLocs } = await supabase
      .from("client_locations")
      .select("lat, lng, address, city, zip_code, name")
      .eq("client_id", clientId)
      .eq("is_default", true)
      .limit(1);

    const loc = clientLocs?.[0];
    if (loc) {
      // Already has coords?
      if (loc.lat && loc.lng) {
        await persistCoords(appointmentId, loc.lat, loc.lng, horseId);
        return { lat: loc.lat, lng: loc.lng, source: "client_location" };
      }
      // Try geocoding the location address
      const result = await geocodeAddress(loc.address, loc.zip_code, loc.city);
      if (result) {
        await persistCoords(appointmentId, result.lat, result.lng, horseId);
        return { ...result, source: "client_location_geocoded" };
      }
    }
  }

  // Priority 2: location free-text
  if (location) {
    const result = await geocodeAddress(location, null, null);
    if (result) {
      await persistCoords(appointmentId, result.lat, result.lng, horseId);
      return { ...result, source: "location_field" };
    }
  }

  // Priority 3: horse stable
  if (horseId) {
    const { data: horse } = await supabase
      .from("horses")
      .select("location_name, latitude, longitude")
      .eq("id", horseId)
      .maybeSingle();

    if (horse?.latitude && horse?.longitude) {
      await persistCoords(appointmentId, horse.latitude, horse.longitude, null);
      return { lat: horse.latitude, lng: horse.longitude, source: "horse_coords" };
    }
    if (horse?.location_name) {
      const result = await geocodeAddress(horse.location_name, null, null);
      if (result) {
        await persistCoords(appointmentId, result.lat, result.lng, horseId);
        return { ...result, source: "horse_stable" };
      }
    }
  }

  // Priority 4: client profile contact address
  if (clientId) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("street, zip_code, city")
      .eq("profile_id", clientId)
      .limit(1)
      .maybeSingle();

    if (contact && (contact.street || contact.zip_code || contact.city)) {
      const result = await geocodeAddress(contact.street, contact.zip_code, contact.city);
      if (result) {
        await persistCoords(appointmentId, result.lat, result.lng, horseId);
        return { ...result, source: "contact_address" };
      }
    }
  }

  return null;
}

async function persistCoords(
  appointmentId: string,
  lat: number,
  lng: number,
  horseId?: string | null
) {
  await supabase
    .from("appointments")
    .update({
      appointment_lat: lat,
      appointment_lng: lng,
      location_geocoded: true,
    })
    .eq("id", appointmentId);

  if (horseId) {
    await supabase
      .from("horses")
      .update({ latitude: lat, longitude: lng })
      .eq("id", horseId);
  }
}
