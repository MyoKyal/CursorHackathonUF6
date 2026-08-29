import { SEED_EVENTS, SEED_LISTINGS, SEED_PROFILES } from "./community-seed";
import {
  applyListingOverlay,
  mergeListings,
  overlayImpact,
  overlayRequestsForListing,
  rememberListing,
  rememberedListings,
} from "./flow-store";
import { createClient } from "./supabase/client";
import type {
  CommunityEvent,
  DonationRequest,
  Listing,
  Profile,
} from "./types";

export type DataSource = "seed" | "live";

async function timed<T>(work: PromiseLike<T>, ms = 8000): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(work),
      new Promise<T>((_, rej) => {
        t = setTimeout(() => rej(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
}

export function mapProfile(row: Record<string, unknown> | null | undefined): Profile | null {
  if (!row) return null;
  return {
    id: row.id as string,
    auth_id: (row.auth_id as string | null) ?? null,
    display_name: row.display_name as string,
    bio: (row.bio as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    is_org: Boolean(row.is_org),
    verified: Boolean(row.verified),
    city: (row.city as string) || "Yangon, Myanmar",
    rating_avg: Number(row.rating_avg ?? 5),
    rating_count: Number(row.rating_count ?? 0),
  };
}

function mapListing(
  row: Record<string, unknown>,
  extras?: { photos?: string[]; request_count?: number; avatars?: string[] },
): Listing {
  const donor =
    mapProfile(row.profiles as Record<string, unknown>) ||
    SEED_PROFILES.find((p) => p.id === row.user_id) ||
    SEED_PROFILES[0];
  const photosRaw = row.listing_photos as { url: string; sort_order: number }[] | undefined;
  const photos =
    extras?.photos ??
    (photosRaw
      ? [...photosRaw].sort((a, b) => a.sort_order - b.sort_order).map((p) => p.url)
      : []);
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as Listing["category"],
    listing_type: row.listing_type as Listing["listing_type"],
    condition: row.condition as string,
    availability: row.availability as Listing["availability"],
    area_label: row.area_label as string,
    lat: Number(row.lat),
    lng: Number(row.lng),
    collection_notes: (row.collection_notes as string | null) ?? null,
    status: row.status as Listing["status"],
    estimated_kg: Number(row.estimated_kg ?? 1),
    is_seed: Boolean(row.is_seed),
    created_at: row.created_at as string,
    photos: photos.length ? photos : SEED_LISTINGS.find((s) => s.id === row.id)?.photos ?? [],
    donor,
    request_count: extras?.request_count ?? 0,
    requester_avatars:
      extras?.avatars ?? (donor.avatar_url ? [donor.avatar_url] : []),
  };
}

async function requestCounts(ids: string[]) {
  const counts: Record<string, number> = {};
  if (!ids.length) return counts;
  try {
    const supabase = createClient();
    const { data: reqs } = await timed(
      supabase.from("donation_requests").select("listing_id").in("listing_id", ids),
      4000,
    );
    for (const r of reqs ?? []) {
      counts[r.listing_id as string] = (counts[r.listing_id as string] ?? 0) + 1;
    }
  } catch {
    // Listing data is still usable when request counts are temporarily unavailable.
  }
  return counts;
}

async function profileMap(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, Profile>();
  if (!unique.length) return map;
  try {
    const supabase = createClient();
    const { data } = await timed(supabase.from("profiles").select("*").in("id", unique), 4000);
    for (const row of data ?? []) {
      const profile = mapProfile(row as Record<string, unknown>);
      if (profile) map.set(profile.id, profile);
    }
  } catch {
    // Seed donor fallback still works if live profiles are slow.
  }
  return map;
}

function mappedRows(
  rows: Record<string, unknown>[],
  counts: Record<string, number>,
  donors: Map<string, Profile>,
) {
  return rows.map((row) => {
    const seed = SEED_LISTINGS.find((item) => item.id === row.id);
    return mapListing(
      { ...row, profiles: donors.get(row.user_id as string) ?? row.profiles },
      {
        request_count: counts[row.id as string] ?? seed?.request_count ?? 0,
        avatars: seed?.requester_avatars,
      },
    );
  });
}

export async function fetchListings(): Promise<{
  listings: Listing[];
  source: DataSource;
  error: string | null;
}> {
  const fallback = mergeListings(rememberedListings(), SEED_LISTINGS);
  try {
    const supabase = createClient();
    const { data, error } = await timed(
      supabase.from("listings").select("*, listing_photos(*)").order("created_at", {
        ascending: false,
      }),
    );
    if (error) {
      return { listings: fallback, source: "seed", error: error.message };
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    const [counts, donors] = await Promise.all([
      requestCounts(rows.map((r) => r.id as string)),
      profileMap(rows.map((r) => r.user_id as string)),
    ]);
    const live = mappedRows(rows, counts, donors);
    for (const listing of live) rememberListing(listing, true);
    return {
      listings: mergeListings(live, rememberedListings(), SEED_LISTINGS),
      source: "live",
      error: null,
    };
  } catch (error) {
    return {
      listings: fallback,
      source: "seed",
      error: error instanceof Error ? error.message : "Could not load live listings",
    };
  }
}

export async function fetchListing(id: string): Promise<Listing | null> {
  const local =
    rememberedListings().find((listing) => listing.id === id) ??
    SEED_LISTINGS.find((listing) => listing.id === id) ??
    null;
  try {
    const supabase = createClient();
    const { data, error } = await timed(
      supabase.from("listings").select("*, listing_photos(*)").eq("id", id).maybeSingle(),
    );
    if (!error && data) {
      const row = data as Record<string, unknown>;
      const [counts, donors] = await Promise.all([
        requestCounts([id]),
        profileMap([row.user_id as string]),
      ]);
      const listing = mappedRows([row], counts, donors)[0];
      rememberListing(listing, true);
      return applyListingOverlay([listing])[0];
    }
  } catch {
    // Fall through to cached/seed listings so a live miss never 404s a known post.
  }
  const { listings } = await fetchListings();
  return listings.find((listing) => listing.id === id) ?? local ?? null;
}

export async function fetchEvents(): Promise<{
  events: CommunityEvent[];
  error: string | null;
}> {
  try {
    const supabase = createClient();
    const { data, error } = await timed(
      supabase
        .from("events")
        .select("*, profiles(*), event_rsvps(profile_id)")
        .order("starts_at", { ascending: true }),
    );
    if (error) {
      return { events: SEED_EVENTS, error: error.message };
    }
    const mapped: CommunityEvent[] = (data ?? []).map((row) => {
      const seed = SEED_EVENTS.find((e) => e.id === row.id);
      const rsvps = (row.event_rsvps as { profile_id: string }[] | null) ?? [];
      return {
        id: row.id,
        host_id: row.host_id,
        title: row.title,
        description: row.description,
        category: row.category,
        starts_at: row.starts_at,
        area_label: row.area_label,
        lat: row.lat,
        lng: row.lng,
        photo_url: row.photo_url || seed?.photo_url || null,
        is_seed: row.is_seed,
        host:
          mapProfile(row.profiles as Record<string, unknown> | null) ||
          SEED_PROFILES.find((p) => p.id === row.host_id) ||
          SEED_PROFILES[0],
        going_count: rsvps.length || seed?.going_count || 0,
        going_avatars: seed?.going_avatars ?? [],
      };
    });
    const have = new Set(mapped.map((e) => e.id));
    return {
      events: [...mapped, ...SEED_EVENTS.filter((e) => !have.has(e.id))],
      error: null,
    };
  } catch (error) {
    return {
      events: SEED_EVENTS,
      error: error instanceof Error ? error.message : "Could not load live events",
    };
  }
}

export async function fetchEvent(id: string): Promise<CommunityEvent | null> {
  const seed = SEED_EVENTS.find((e) => e.id === id) ?? null;
  const { events } = await fetchEvents();
  return events.find((e) => e.id === id) ?? seed;
}

export async function fetchImpact() {
  const base = {
    completedDonations: SEED_LISTINGS.filter((l) => l.status === "completed").length,
    kgDiverted: SEED_LISTINGS.filter((l) => l.status === "completed").reduce(
      (s, l) => s + l.estimated_kg,
      0,
    ),
    peopleHelped: 184,
  };
  try {
    const supabase = createClient();
    const { data, error } = await timed(
      supabase.from("listings").select("estimated_kg, status").eq("status", "completed"),
    );
    if (error || !data) return overlayImpact(base);
    const completed = data.length || base.completedDonations;
    const kg = data.length
      ? data.reduce((s, r) => s + Number(r.estimated_kg ?? 0), 0)
      : base.kgDiverted;
    return overlayImpact({
      completedDonations: completed,
      kgDiverted: Math.round(kg),
      peopleHelped: 184,
    });
  } catch {
    return overlayImpact(base);
  }
}

export async function fetchRequestsForListing(listingId: string): Promise<DonationRequest[]> {
  try {
    const supabase = createClient();
    const { data, error } = await timed(
      supabase
        .from("donation_requests")
        .select("*, profiles(*)")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false }),
    );
    if (error) return overlayRequestsForListing(listingId, []);
    const remote = (data ?? []).map((r) => ({
      id: r.id,
      listing_id: r.listing_id,
      requester_id: r.requester_id,
      message: r.message,
      status: r.status,
      created_at: r.created_at,
      requester: mapProfile(r.profiles) ?? undefined,
    }));
    return overlayRequestsForListing(listingId, remote);
  } catch {
    return overlayRequestsForListing(listingId, []);
  }
}
