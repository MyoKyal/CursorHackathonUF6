"use client";

import { BrandMark } from "@/components/brand-mark";
import { fetchImpact } from "@/lib/data";
import Link from "next/link";
import { useEffect, useState } from "react";

export function LandingPage() {
  const [stats, setStats] = useState({ kgDiverted: 11, peopleHelped: 184, completedDonations: 1 });
  useEffect(() => {
    fetchImpact().then(setStats);
  }, []);

  return (
    <div className="bg-white">
      <header className="flex items-center justify-between px-4 py-4">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Link href="/auth?next=/profile" className="text-sm font-medium text-muted-foreground">
            Sign in
          </Link>
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Open feed
          </Link>
        </div>
      </header>

      <section className="px-4 pb-8 pt-2">
        <p className="text-sm font-medium text-primary">Yangon · donation first. Exchange optional.</p>
        <h1 className="mt-2 text-[2rem] font-semibold leading-[1.15] tracking-tight">
          Give what you no longer need. Keep it out of the drain.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Loopify is a Yangon donation network in English. Post usable clothes, books,
          electronics, furniture, sealed food, and recyclables from Bahan, Kamayut, Insein,
          Tamwe, and other Yangon townships. Neighbors and organizations request them,
          then you choose who collects.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/explore"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground"
          >
            Browse nearby
          </Link>
          <Link
            href="/give"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-muted px-6 font-semibold"
          >
            Give an item
          </Link>
          <Link
            href="/events"
            className="inline-flex min-h-12 items-center justify-center rounded-full px-6 font-semibold text-primary"
          >
            Community events
          </Link>
        </div>
      </section>

      <section className="px-4 pb-10">
        <div className="overflow-hidden rounded-[1.5rem] bg-[#f4f7f1]">
          <img
            src="/loopify-logo.jpg"
            alt="Loopify — Recycle. Exchange. Renew."
            className="mx-auto h-56 w-auto object-contain py-4"
          />
        </div>
        <h2 className="mt-5 text-xl font-semibold">The bottle story</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          You have a pile of plastic bottles in Bahan. Dumping them on the road or into a
          monsoon drain is waste. On Loopify you post the sacks, a volunteer or recycling
          group requests pickup, and they deliver the load to a Yangon recovery workshop —
          the same loop that already moved bottles off Golden Valley Road.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-2 px-4 pb-10">
        {[
          { n: stats.completedDonations, l: "Donations done" },
          { n: stats.peopleHelped, l: "People helped" },
          { n: `${stats.kgDiverted}kg`, l: "Waste diverted" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl bg-emerald-50 px-2 py-4 text-center">
            <p className="text-xl font-semibold tabular-nums">{s.n}</p>
            <p className="mt-1 text-xs leading-tight text-emerald-900">{s.l}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4 px-4 pb-12">
        <h2 className="text-xl font-semibold">How it works</h2>
        {[
          {
            t: "Photograph",
            d: "Snap or upload the item. Loopify AI suggests title, category, condition, weight, and whether to reuse, repair, or recycle.",
          },
          {
            t: "Post",
            d: "Donation is the default. Swap is optional. Township and collection notes stay in English.",
          },
          {
            t: "Request",
            d: "Someone who needs the item — or can recycle it — explains why. You pick one recipient.",
          },
          {
            t: "Collect",
            d: "Arrange pickup in messages. Confirm when it is done so Yangon impact stays honest.",
          },
        ].map((step, i) => (
          <div key={step.t} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold">{step.t}</p>
              <p className="text-sm text-muted-foreground">{step.d}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
