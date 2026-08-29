"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { FeedPhoto } from "@/components/feed-photo";
import { categoryLabel, haversineKm, DEFAULT_CENTER } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";
import type { Listing } from "@/lib/types";
import { announceDataChange } from "@/lib/use-data-refresh";
import { formatDistanceToNow } from "date-fns";
import { Heart, Share, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ListingCard({
  listing,
  origin = DEFAULT_CENTER,
}: {
  listing: Listing;
  origin?: { lat: number; lng: number };
}) {
  const { profile } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const km = haversineKm(origin.lat, origin.lng, listing.lat, listing.lng);
  const photo = listing.photos[0];
  const [when, setWhen] = useState("Recently");

  useEffect(() => {
    setWhen(formatDistanceToNow(new Date(listing.created_at), { addSuffix: true }));
  }, [listing.created_at]);

  useEffect(() => {
    if (!profile) {
      setSaved(false);
      return;
    }
    const supabase = createClient();
    void supabase
      .from("saves")
      .select("listing_id")
      .eq("profile_id", profile.id)
      .eq("listing_id", listing.id)
      .maybeSingle()
      .then(({ data }) => setSaved(Boolean(data)));
  }, [listing.id, profile]);

  async function toggleSaved() {
    if (!profile) {
      router.push(`/auth?next=${encodeURIComponent(`/listings/${listing.id}`)}`);
      return;
    }
    const nextSaved = !saved;
    setSaved(nextSaved);
    const supabase = createClient();
    const { error } = nextSaved
      ? await supabase.from("saves").insert({
          profile_id: profile.id,
          listing_id: listing.id,
        })
      : await supabase
          .from("saves")
          .delete()
          .eq("profile_id", profile.id)
          .eq("listing_id", listing.id);
    if (error) {
      setSaved(!nextSaved);
      toast.error(error.message);
      return;
    }
    announceDataChange();
  }

  return (
    <article className="px-4 pb-8">
      <Link href={`/listings/${listing.id}`} className="block">
        <div className="relative overflow-hidden rounded-[1.35rem]">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
            <FeedPhoto src={photo} alt={listing.title} className="h-full w-full object-cover" />
          </div>
          <div className="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
              aria-label="Share"
              onClick={(e) => {
                e.preventDefault();
                if (navigator.share) {
                  navigator.share({ title: listing.title, url: window.location.origin + `/listings/${listing.id}` }).catch(() => {});
                }
              }}
            >
              <Share className="size-4" />
            </button>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
              aria-label="Save"
              onClick={(e) => {
                e.preventDefault();
                void toggleSaved();
              }}
            >
              <Heart className={`size-4 ${saved ? "fill-red-500 text-red-500" : ""}`} />
            </button>
          </div>
          {listing.listing_type === "exchange" ? (
            <Badge className="absolute left-3 top-3 rounded-full bg-white/90 text-foreground">
              Swap
            </Badge>
          ) : listing.status === "promised" ? (
            <Badge className="absolute left-3 top-3 rounded-full bg-amber-500 text-white">
              Promised
            </Badge>
          ) : listing.status === "completed" ? (
            <Badge className="absolute left-3 top-3 rounded-full bg-primary text-primary-foreground">
              Delivered
            </Badge>
          ) : null}
        </div>
        <div className="pt-3">
          <h2 className="text-[1.15rem] font-semibold leading-snug tracking-tight">
            {listing.title}
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {listing.availability === "now"
              ? "Available now · gate pickup"
              : listing.availability === "today"
                ? "Pickup today"
                : listing.availability === "tomorrow"
                  ? "Available tomorrow"
                  : "This weekend"}{" "}
            · {when}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} · {listing.area_label} · by {listing.donor.display_name}
            {listing.donor.verified ? " ✓" : ""} ·{" "}
            <span className="font-medium text-emerald-700">
              {listing.donor.rating_avg.toFixed(1)} <Star className="inline size-3 fill-emerald-600 text-emerald-600" />
            </span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex -space-x-2">
              {(listing.requester_avatars.length
                ? listing.requester_avatars
                : [listing.donor.avatar_url]
              )
                .filter(Boolean)
                .slice(0, 4)
                .map((src, i) => (
                  <img
                    key={i}
                    src={src!}
                    alt=""
                    className="size-6 rounded-full border-2 border-white object-cover"
                  />
                ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {listing.request_count} requested · {categoryLabel(listing.category)}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
