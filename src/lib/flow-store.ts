import { SEED_LISTINGS, SEED_PROFILES } from "./community-seed";
import type {
  ChatMessage,
  DonationRequest,
  Listing,
  ListingStatus,
  RequestStatus,
  Thread,
} from "./types";

const KEY = "loopify-yangon-flow-v1";

export type FlowThread = Thread & { title?: string };

type FlowState = {
  listingStatus: Record<string, ListingStatus>;
  listings: Listing[];
  requests: DonationRequest[];
  threads: FlowThread[];
  messages: ChatMessage[];
};

const empty: FlowState = {
  listingStatus: {},
  listings: [],
  requests: [],
  threads: [],
  messages: [],
};

export function loadFlow(): FlowState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<FlowState>;
    return {
      ...empty,
      ...parsed,
      listings: Array.isArray(parsed.listings) ? parsed.listings : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      threads: Array.isArray(parsed.threads) ? parsed.threads : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      listingStatus: parsed.listingStatus ?? {},
    };
  } catch {
    return empty;
  }
}

function saveFlow(state: FlowState, silent = false) {
  localStorage.setItem(KEY, JSON.stringify(state));
  if (!silent && typeof window !== "undefined") {
    window.dispatchEvent(new Event("loopify-flow"));
  }
}

function uid() {
  return crypto.randomUUID();
}

export const DEMO_SEED_OWNERS: Record<string, string[]> = {
  "susu.yangon@loopify.demo": ["22222222-2222-2222-2222-222222222222"],
  "aung.volunteer@loopify.demo": ["44444444-4444-4444-4444-444444444444"],
  "may.mandalay@loopify.demo": ["33333333-3333-3333-3333-333333333333"],
  "recycle.yangon@loopify.demo": [
    "11111111-1111-1111-1111-111111111111",
    "55555555-5555-5555-5555-555555555555",
  ],
};

export function isListingOwner(
  listing: Listing,
  profileId: string | undefined,
  email: string | undefined | null,
) {
  if (!profileId) return false;
  if (listing.user_id === profileId) return true;
  const mapped = email ? DEMO_SEED_OWNERS[email] : undefined;
  return Boolean(mapped?.includes(listing.user_id));
}

export function rememberListing(listing: Listing, silent = false) {
  const flow = loadFlow();
  flow.listings = [listing, ...flow.listings.filter((item) => item.id !== listing.id)];
  saveFlow(flow, silent);
}

export function rememberedListings(): Listing[] {
  return loadFlow().listings;
}

export function mergeListings(...groups: Listing[][]) {
  const byId = new Map<string, Listing>();
  for (const group of groups) {
    for (const listing of group) {
      const current = byId.get(listing.id);
      if (!current) {
        byId.set(listing.id, listing);
        continue;
      }
      byId.set(listing.id, {
        ...current,
        ...listing,
        photos: listing.photos.length ? listing.photos : current.photos,
        request_count: Math.max(current.request_count, listing.request_count),
        requester_avatars: listing.requester_avatars.length
          ? listing.requester_avatars
          : current.requester_avatars,
      });
    }
  }
  return applyListingOverlay(
    [...byId.values()].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
  );
}

export function applyListingOverlay(listings: Listing[]): Listing[] {
  const flow = loadFlow();
  return listings.map((l) => {
    const extra = flow.requests.filter((r) => r.listing_id === l.id).length;
    return {
      ...l,
      status: flow.listingStatus[l.id] ?? l.status,
      request_count: Math.max(l.request_count, extra),
    };
  });
}

export function overlayRequestsForListing(
  listingId: string,
  remote: DonationRequest[],
): DonationRequest[] {
  const flow = loadFlow();
  const local = flow.requests.filter((r) => r.listing_id === listingId);
  const have = new Set(remote.map((r) => r.id));
  return [...remote, ...local.filter((r) => !have.has(r.id))];
}

export function addRequest(input: {
  listing_id: string;
  requester_id: string;
  message: string;
  requesterName?: string;
  requesterAvatar?: string | null;
}) {
  const flow = loadFlow();
  if (
    flow.requests.some(
      (r) => r.listing_id === input.listing_id && r.requester_id === input.requester_id,
    )
  ) {
    return;
  }
  const req: DonationRequest = {
    id: uid(),
    listing_id: input.listing_id,
    requester_id: input.requester_id,
    message: input.message,
    status: "pending",
    created_at: new Date().toISOString(),
    requester: {
      id: input.requester_id,
      auth_id: input.requester_id,
      display_name: input.requesterName ?? "Neighbor",
      bio: null,
      avatar_url: input.requesterAvatar ?? null,
      is_org: false,
      verified: false,
      city: "Yangon, Myanmar",
      rating_avg: 5,
      rating_count: 0,
    },
  };
  flow.requests.unshift(req);
  saveFlow(flow);
  return req;
}

export function upsertRequest(req: DonationRequest) {
  const flow = loadFlow();
  flow.requests = [req, ...flow.requests.filter((r) => r.id !== req.id)];
  saveFlow(flow);
}

export function chooseRecipient(listing: Listing, requestId: string) {
  const flow = loadFlow();
  const chosen = flow.requests.find((r) => r.id === requestId);
  flow.requests = flow.requests.map((r) => {
    if (r.listing_id !== listing.id) return r;
    const status: RequestStatus = r.id === requestId ? "accepted" : "declined";
    return { ...r, status };
  });
  flow.listingStatus[listing.id] = "promised";
  const recipientId = chosen?.requester_id;
  if (recipientId) {
    let thread = flow.threads.find(
      (t) => t.listing_id === listing.id && t.recipient_id === recipientId,
    );
    if (!thread) {
      thread = {
        id: uid(),
        listing_id: listing.id,
        donor_id: listing.user_id,
        recipient_id: recipientId,
        created_at: new Date().toISOString(),
        title: listing.title,
      };
      flow.threads.unshift(thread);
      flow.messages.push({
        id: uid(),
        thread_id: thread.id,
        sender_id: listing.user_id,
        body: `You were chosen for “${listing.title}”. Let’s arrange collection in Yangon.`,
        created_at: new Date().toISOString(),
      });
    }
    saveFlow(flow);
    return thread;
  }
  saveFlow(flow);
  return null;
}

export function declineRequest(requestId: string) {
  const flow = loadFlow();
  flow.requests = flow.requests.map((r) =>
    r.id === requestId ? { ...r, status: "declined" as const } : r,
  );
  saveFlow(flow);
}

export function completeListing(listingId: string) {
  const flow = loadFlow();
  flow.listingStatus[listingId] = "completed";
  saveFlow(flow);
}

export function overlayThreads(profileId: string, email?: string | null): FlowThread[] {
  const flow = loadFlow();
  const seedIds = email ? DEMO_SEED_OWNERS[email] ?? [] : [];
  return flow.threads.filter(
    (t) =>
      t.donor_id === profileId ||
      t.recipient_id === profileId ||
      seedIds.includes(t.donor_id),
  );
}

export function overlayMessages(threadId: string) {
  return loadFlow().messages.filter((m) => m.thread_id === threadId);
}

export function addOverlayMessage(threadId: string, senderId: string, body: string) {
  const flow = loadFlow();
  flow.messages.push({
    id: uid(),
    thread_id: threadId,
    sender_id: senderId,
    body,
    created_at: new Date().toISOString(),
  });
  saveFlow(flow);
}

export function listingById(id: string, listings: Listing[]) {
  return listings.find((l) => l.id === id) ?? SEED_LISTINGS.find((l) => l.id === id) ?? null;
}

export function donorName(id: string) {
  return SEED_PROFILES.find((p) => p.id === id)?.display_name ?? "Neighbor";
}

export function overlayImpact(base: { completedDonations: number; kgDiverted: number; peopleHelped: number }) {
  const flow = loadFlow();
  const completedIds = Object.entries(flow.listingStatus)
    .filter(([, s]) => s === "completed")
    .map(([id]) => id);
  const extraKg = completedIds.reduce((s, id) => {
    const l = SEED_LISTINGS.find((x) => x.id === id);
    return s + (l?.estimated_kg ?? 0);
  }, 0);
  const accepted = flow.requests.filter((r) => r.status === "accepted").length;
  return {
    completedDonations: base.completedDonations + completedIds.filter((id) => {
      const seed = SEED_LISTINGS.find((l) => l.id === id);
      return !seed || seed.status !== "completed";
    }).length,
    kgDiverted: Math.round(base.kgDiverted + extraKg),
    peopleHelped: Math.max(base.peopleHelped, 184 + accepted),
  };
}

export function myOverlayListings(profileId: string, email: string | null | undefined, all: Listing[]) {
  const owners = new Set([profileId, ...(email ? DEMO_SEED_OWNERS[email] ?? [] : [])]);
  return applyListingOverlay(all).filter((l) => owners.has(l.user_id));
}

export function myOverlayRequests(profileId: string) {
  return loadFlow().requests.filter((r) => r.requester_id === profileId);
}
