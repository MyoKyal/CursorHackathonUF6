"use client";

import { fetchImpact, fetchListings } from "@/lib/data";
import type { Listing } from "@/lib/types";
import { Recycle, Users, PackageCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useDataRefresh } from "@/lib/use-data-refresh";

export function ImpactDashboard() {
  const [stats, setStats] = useState({
    completedDonations: 0,
    peopleHelped: 0,
    kgDiverted: 0,
  });
  const [stories, setStories] = useState<Listing[]>([]);

  async function load() {
    const [nextStats, result] = await Promise.all([fetchImpact(), fetchListings()]);
    setStats(nextStats);
    setStories(result.listings.filter((listing) => listing.status === "completed").slice(0, 6));
  }

  useDataRefresh(load, ["listings", "donation_requests"]);

  const cards = [
    { label: "Completed donations", value: stats.completedDonations, icon: PackageCheck },
    { label: "Neighbors helped", value: stats.peopleHelped, icon: Users },
    { label: "Kg kept out of waste", value: stats.kgDiverted, icon: Recycle },
  ];

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Impact</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Live completions from Loopify plus the Bahan bottle run that started this idea.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-[1.2rem] bg-emerald-50 p-4">
            <c.icon className="size-5 text-primary" />
            <p className="mt-3 text-3xl font-semibold tabular-nums">{c.value}</p>
            <p className="text-sm text-emerald-900">{c.label}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-lg font-semibold">Recent completions</h2>
      {stories.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Complete a pickup to add your story here.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {stories.map((s) => (
            <li key={s.id}>
              <Link href={`/listings/${s.id}`} className="flex gap-3 rounded-2xl bg-muted/50 p-2">
                {s.photos[0] ? (
                  <img src={s.photos[0]} alt="" className="size-16 rounded-xl object-cover" />
                ) : null}
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.estimated_kg} kg · {s.area_label}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
