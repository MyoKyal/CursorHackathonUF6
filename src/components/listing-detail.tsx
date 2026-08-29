"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchListing, fetchRequestsForListing } from "@/lib/data";
import {
  addRequest,
  chooseRecipient,
  completeListing,
  declineRequest,
  isListingOwner,
  upsertRequest,
} from "@/lib/flow-store";
import { SEED_LISTINGS } from "@/lib/community-seed";
import { createClient } from "@/lib/supabase/client";
import type { DonationRequest, Listing } from "@/lib/types";
import { announceDataChange, useDataRefresh } from "@/lib/use-data-refresh";
import { format } from "date-fns";
import { Flag, Loader2, MapPin, ShieldCheck, Star } from "lucide-react";
import { FeedPhoto } from "@/components/feed-photo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ListingDetail({ id }: { id: string }) {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(() => {
    return SEED_LISTINGS.find((l) => l.id === id) ?? null;
  });
  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [need, setNeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [stars, setStars] = useState(5);

  async function reload() {
    const l = await fetchListing(id);
    if (l) {
      setListing(l);
      setRequests(await fetchRequestsForListing(l.id));
    }
  }

  useDataRefresh(
    reload,
    ["profiles", "listings", "listing_photos", "donation_requests", "threads", "ratings"],
  );

  if (!listing) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="font-medium">Listing not found</p>
        <Link href="/" className="mt-2 inline-block text-primary">
          Back to feed
        </Link>
      </div>
    );
  }

  const isOwner = isListingOwner(listing, profile?.id, user?.email);
  const myRequest = requests.find((r) => r.requester_id === profile?.id);
  const photo = listing.photos[0];

  async function requireUser() {
    if (!user || !profile) {
      router.push(`/auth?next=/listings/${id}`);
      return null;
    }
    return { user, profile };
  }

  async function submitRequest() {
    if (!listing) return;
    const session = await requireUser();
    if (!session) return;
    if (need.trim().length < 8) {
      toast.error("Tell the donor briefly why you need this.");
      return;
    }
    setBusy(true);
    addRequest({
      listing_id: listing.id,
      requester_id: session.profile.id,
      message: need.trim(),
      requesterName: session.profile.display_name,
      requesterAvatar: session.profile.avatar_url,
    });
    setListing({
      ...listing,
      request_count: Math.max(listing.request_count + 1, 1),
    });
    const supabase = createClient();
    const { error } = await supabase.from("donation_requests").insert({
      listing_id: listing.id,
      requester_id: session.profile.id,
      message: need.trim(),
    });
    setBusy(false);
    if (error && error.code !== "23505" && !session.user.email?.endsWith("@loopify.demo")) {
      toast.error(error.message);
    } else {
      toast.success(
        listing.listing_type === "exchange"
          ? "Swap offer sent"
          : "Request sent. The donor will review it.",
      );
    }
    announceDataChange();
    setNeed("");
    await reload();
  }

  async function decide(req: DonationRequest, status: "accepted" | "declined") {
    if (!listing) return;
    setBusy(true);
    const supabase = createClient();
    upsertRequest(req);
    if (status === "declined") {
      declineRequest(req.id);
      await supabase.from("donation_requests").update({ status }).eq("id", req.id);
      setBusy(false);
      toast.success("Request declined.");
      announceDataChange();
      await reload();
      return;
    }
    await supabase.from("donation_requests").update({ status: "accepted" }).eq("id", req.id);
    await supabase.from("listings").update({ status: "promised" }).eq("id", listing.id);
    const others = requests.filter((r) => r.id !== req.id);
    for (const o of others) {
      declineRequest(o.id);
      await supabase.from("donation_requests").update({ status: "declined" }).eq("id", o.id);
    }
    const thread = chooseRecipient(listing, req.id);
    const { data: remoteThread } = await supabase
      .from("threads")
      .upsert(
        {
          listing_id: listing.id,
          donor_id: listing.user_id,
          recipient_id: req.requester_id,
        },
        { onConflict: "listing_id,donor_id,recipient_id" },
      )
      .select()
      .maybeSingle();
    const threadId = remoteThread?.id ?? thread?.id;
    if (remoteThread) {
      await supabase.from("messages").insert({
        thread_id: remoteThread.id,
        sender_id: listing.user_id,
        body: `You were chosen for “${listing.title}”. Let’s arrange collection in Yangon.`,
      });
      await supabase.from("notifications").insert({
        profile_id: req.requester_id,
        title: "You were selected",
        body: `Pickup for ${listing.title} is yours to arrange.`,
        href: `/messages/${remoteThread.id}`,
      });
    }
    setListing({ ...listing, status: "promised" });
    setBusy(false);
    toast.success("Recipient chosen. Arrange pickup in messages.");
    announceDataChange();
    if (threadId) router.push(`/messages/${threadId}`);
    else reload();
  }

  async function complete() {
    if (!listing) return;
    const session = await requireUser();
    if (!session) return;
    setBusy(true);
    const supabase = createClient();
    const { error: completeError } = await supabase
      .from("listings")
      .update({ status: "completed" })
      .eq("id", listing.id);
    if (completeError && session.user.email?.endsWith("@loopify.demo")) {
      completeListing(listing.id);
    } else if (completeError) {
      setBusy(false);
      toast.error(completeError.message);
      return;
    }
    const toId =
      session.profile.id === listing.user_id
        ? requests.find((r) => r.status === "accepted")?.requester_id
        : listing.user_id;
    if (toId) {
      await supabase.from("ratings").insert({
        listing_id: listing.id,
        from_id: session.profile.id,
        to_id: toId,
        stars,
      });
    }
    setListing({ ...listing, status: "completed" });
    setBusy(false);
    toast.success("Pickup confirmed. This donation is complete.");
    announceDataChange();
    await reload();
  }

  async function report() {
    if (!listing) return;
    const session = await requireUser();
    if (!session) return;
    const supabase = createClient();
    const { error } = await supabase.from("reports").insert({
      reporter_id: session.profile.id,
      listing_id: listing.id,
      reason: reportReason || "Inappropriate or unsafe",
    });
    if (error) toast.error(error.message);
    else toast.success("Report received. Thanks for keeping Loopify safe.");
    setReportOpen(false);
  }

  return (
    <div>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <FeedPhoto src={photo} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="px-4 pb-8 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {listing.status === "promised"
            ? "Promised · awaiting pickup"
            : listing.status === "completed"
              ? "Completed"
              : listing.listing_type === "exchange"
                ? "Optional exchange"
                : "Donation"}{" "}
          · {listing.condition}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{listing.title}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          {listing.area_label} · {listing.donor.display_name}
          {listing.donor.verified ? (
            <span className="inline-flex items-center gap-0.5 text-primary">
              <ShieldCheck className="size-4" /> Verified
            </span>
          ) : null}
          <span className="inline-flex items-center gap-0.5 text-emerald-700">
            <Star className="size-3.5 fill-emerald-600" />
            {listing.donor.rating_avg.toFixed(1)} ({listing.donor.rating_count})
          </span>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-800">
          {listing.description}
        </p>
        {listing.collection_notes ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
            <p className="font-semibold">Collection</p>
            <p className="mt-1">{listing.collection_notes}</p>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          Posted {format(new Date(listing.created_at), "MMM d")} · ~{listing.estimated_kg} kg
          diverted if reused or recycled
        </p>

        {listing.id.startsWith("a1a1") ? (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 text-sm">
            <strong>The Loopify story:</strong> bottles sitting by a Yangon stairwell do not
            belong in a drain. Request this pickup if you can haul them to a recycling workshop.
          </p>
        ) : null}

        {isOwner ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Requests</h2>
            {requests.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {requests.map((r) => (
                  <li key={r.id} className="rounded-2xl border p-3">
                    <p className="font-medium">
                      {r.requester?.display_name ?? "Neighbor"} · {r.status}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{r.message}</p>
                    {r.status === "pending" && listing.status === "open" ? (
                      <div className="mt-3 flex gap-2">
                        <Button size="lg" className="min-h-11 flex-1 rounded-full" disabled={busy} onClick={() => decide(r, "accepted")}>
                          Choose
                        </Button>
                        <Button size="lg" variant="outline" className="min-h-11 flex-1 rounded-full" disabled={busy} onClick={() => decide(r, "declined")}>
                          Decline
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {listing.status === "promised" ? (
              <div className="mt-6 space-y-3">
                <label className="text-sm font-medium">Rate the recipient</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={stars}
                  onChange={(e) => setStars(Number(e.target.value))}
                  className="w-full"
                />
                <Button className="min-h-12 w-full rounded-full" disabled={busy} onClick={complete}>
                  Confirm pickup complete
                </Button>
              </div>
            ) : null}
          </section>
        ) : listing.status === "completed" ? (
          <p className="mt-6 rounded-2xl bg-muted p-4 text-sm">This donation already found a home in Yangon.</p>
        ) : listing.status === "promised" && myRequest?.status !== "accepted" ? (
          <p className="mt-6 rounded-2xl bg-muted p-4 text-sm">
            A recipient is already arranging pickup for this item.
          </p>
        ) : myRequest ? (
          <div className="mt-6 space-y-3 rounded-2xl bg-muted p-4 text-sm">
            <p>
              Your request is <strong>{myRequest.status}</strong>.{" "}
              {myRequest.status === "accepted" ? (
                <Link href="/messages" className="text-primary underline">
                  Open messages
                </Link>
              ) : (
                "Hang tight — the donor is reviewing requests."
              )}
            </p>
            {myRequest.status === "accepted" && listing.status === "promised" ? (
              <Button className="min-h-12 w-full rounded-full" disabled={busy} onClick={complete}>
                Confirm I picked this up
              </Button>
            ) : null}
          </div>
        ) : (
          <section className="mt-6">
            <label className="text-sm font-medium">
              {listing.listing_type === "exchange"
                ? "What can you offer in return?"
                : "Why do you need this?"}
            </label>
            <Textarea
              className="mt-2 min-h-24 rounded-2xl text-base"
              placeholder={
                listing.listing_type === "exchange"
                  ? "I can swap a bike lock and helmet this weekend…"
                  : "I volunteer with a recycling crew and can drop these at a Yangon recovery workshop…"
              }
              value={need}
              onChange={(e) => setNeed(e.target.value)}
            />
            <Button
              className="mt-3 min-h-12 w-full rounded-full text-base"
              disabled={busy || authLoading}
              onClick={submitRequest}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              {listing.listing_type === "exchange" ? "Offer swap" : "Request donation"}
            </Button>
            {!user ? (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                You will sign in to send this.
              </p>
            ) : null}
          </section>
        )}

        <button
          type="button"
          onClick={() => setReportOpen((s) => !s)}
          className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
        >
          <Flag className="size-4" /> Report listing
        </button>
        {reportOpen ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="What’s wrong?"
              className="rounded-2xl"
            />
            <Button variant="destructive" className="rounded-full" onClick={report}>
              Submit report
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
