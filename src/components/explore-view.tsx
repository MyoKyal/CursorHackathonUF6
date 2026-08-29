"use client";

import { BrandMark } from "@/components/brand-mark";
import { ListingCard } from "@/components/listing-card";
import { AVAILABILITY_CHIPS, CATEGORIES, DEFAULT_CENTER } from "@/lib/categories";
import { SEED_EVENTS, SEED_LISTINGS } from "@/lib/community-seed";
import { fetchEvents, fetchListings } from "@/lib/data";
import type { Availability, Category, CommunityEvent, Listing } from "@/lib/types";
import { useDataRefresh } from "@/lib/use-data-refresh";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Filter,
  Map as MapIcon,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const ExploreMap = dynamic(() => import("@/components/explore-map"), { ssr: false });

export function ExploreView() {
  const [listings, setListings] = useState<Listing[]>(SEED_LISTINGS);
  const [events, setEvents] = useState<CommunityEvent[]>(SEED_EVENTS);
  const [source, setSource] = useState<string>("seed");
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<Availability | "upcoming">("upcoming");
  const [cat, setCat] = useState<Category | "all">("all");
  const [showMap, setShowMap] = useState(false);
  const [origin, setOrigin] = useState(DEFAULT_CENTER);
  const [currentTime, setCurrentTime] = useState(0);

  async function load() {
    const [listingResult, eventResult] = await Promise.all([fetchListings(), fetchEvents()]);
    setListings(listingResult.listings);
    setSource(listingResult.source);
    setEvents(eventResult.events);
  }

  useDataRefresh(
    load,
    ["profiles", "listings", "listing_photos", "donation_requests", "events", "event_rsvps"],
  );

  useEffect(() => {
    setCurrentTime(Date.now());
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const { latitude: lat, longitude: lng } = p.coords;
          if (lat >= 16.7 && lat <= 17.1 && lng >= 96.05 && lng <= 96.35) {
            setOrigin({ lat, lng });
          }
        },
        () => {},
        { timeout: 4000 },
      );
    }
  }, []);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (l.status === "completed") return false;
      if (cat !== "all" && l.category !== cat) return false;
      if (chip !== "upcoming" && l.availability !== chip) return false;
      if (q.trim()) {
        const hay = `${l.title} ${l.description} ${l.area_label} ${l.donor.display_name}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [listings, cat, chip, q]);

  const nearbyEvents = events
    .filter((event) => currentTime === 0 || new Date(event.starts_at).getTime() > currentTime)
    .slice(0, 3);

  return (
    <div>
      <header className="sticky top-0 z-20 space-y-3 bg-white/95 px-4 pb-2 pt-3 backdrop-blur-md md:px-0">
        <div className="flex items-center justify-between md:hidden">
          <Link href="/">
            <BrandMark compact />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/profile" className="text-sm font-medium">
              Profile
            </Link>
            <Link href="/events" className="text-sm font-medium text-primary">
              Events
            </Link>
            <Link
              href="/give"
              className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Give
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-h-12 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search donations or events..."
              className="h-12 w-full rounded-full border-0 bg-muted px-12 text-base outline-none ring-0 placeholder:text-muted-foreground focus:bg-muted/80"
            />
            <SlidersHorizontal className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {AVAILABILITY_CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChip(c.id)}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-sm font-medium",
                chip === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="relative -mx-4 md:mx-0">
          <div
            aria-label="Donation categories"
            className="flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 pr-14 [overscroll-behavior-x:contain] [scrollbar-width:none] md:snap-none md:justify-between md:overflow-visible md:px-0 md:pr-0 [&::-webkit-scrollbar]:hidden"
          >
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className="flex min-h-14 min-w-[4.5rem] shrink-0 snap-start scroll-ml-4 flex-col items-center justify-center gap-1 rounded-xl px-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:scroll-ml-0"
              >
                <span className="text-lg leading-none">{c.icon}</span>
                <span
                  className={cn(
                    "whitespace-nowrap text-xs",
                    cat === c.id
                      ? "border-b-2 border-foreground pb-0.5 font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  {c.label}
                </span>
              </button>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent pr-2 md:hidden"
          >
            <ChevronRight className="size-4 rounded-full bg-white text-muted-foreground shadow-sm" />
          </div>
        </div>
      </header>

      {source === "seed" ? (
        <p className="mx-4 mb-3 text-xs text-muted-foreground">
          Showing saved community stories while live data reconnects.
        </p>
      ) : null}

      {showMap ? (
        <div className="md:px-0">
          <ExploreMap listings={filtered} events={nearbyEvents} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Filter className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No donations match those filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another category, or{" "}
            <Link href="/give" className="text-primary underline">
              give an item
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start lg:gap-8 lg:px-0">
          <div>
            {filtered.map((l) => (
              <ListingCard key={l.id} listing={l} origin={origin} />
            ))}
            {nearbyEvents.length > 0 ? (
              <section className="px-4 pb-10">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Nearby events
                </h3>
                <div className="space-y-3">
                  {nearbyEvents.map((e) => (
                    <Link
                      key={e.id}
                      href={`/events/${e.id}`}
                      className="flex gap-3 rounded-2xl bg-muted/60 p-2"
                    >
                      {e.photo_url ? (
                        <img
                          src={e.photo_url}
                          alt=""
                          className="size-16 rounded-xl object-cover"
                        />
                      ) : null}
                      <div>
                        <p className="font-medium leading-snug">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.area_label} · {e.going_count} going
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
          <aside className="sticky top-20 hidden h-[calc(100dvh-8rem)] overflow-hidden rounded-2xl border lg:block">
            <ExploreMap listings={filtered} events={nearbyEvents} />
          </aside>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMap((s) => !s)}
        className="fixed left-1/2 z-30 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg md:hidden"
        style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom))" }}
      >
        <MapIcon className="size-4" />
        {showMap ? "Feed" : "Map"}
      </button>
    </div>
  );
}
