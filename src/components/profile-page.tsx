"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchListings } from "@/lib/data";
import { myOverlayListings, myOverlayRequests, overlayThreads } from "@/lib/flow-store";
import { createClient } from "@/lib/supabase/client";
import type { DonationRequest, Listing, Thread } from "@/lib/types";
import { announceDataChange, useDataRefresh } from "@/lib/use-data-refresh";
import { LogOut, MapPin, MessageCircle, Package, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ProfilePage() {
  const { user, profile, loading, refresh } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("Yangon, Myanmar");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"donations" | "requests" | "chats">("donations");

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setBio(profile?.bio ?? "");
    setCity(profile?.city ?? "Yangon, Myanmar");
  }, [profile]);

  async function loadActivity() {
    const listingResult = await fetchListings();
    setListings(listingResult.listings);
    if (!profile) return;
    const profileId = profile.id;

    const supabase = createClient();
    const [{ data: requestRows }, { data: threadRows }] = await Promise.all([
      supabase
        .from("donation_requests")
        .select("*")
        .eq("requester_id", profileId)
        .order("created_at", { ascending: false }),
      supabase
        .from("threads")
        .select("*, listings(title)")
        .or(`donor_id.eq.${profileId},recipient_id.eq.${profileId}`)
        .order("created_at", { ascending: false }),
    ]);

    const localRequests = myOverlayRequests(profileId);
    const remoteRequests = (requestRows ?? []) as DonationRequest[];
    const remoteRequestIds = new Set(remoteRequests.map((request) => request.id));
    setRequests([
      ...remoteRequests,
      ...localRequests.filter((request) => !remoteRequestIds.has(request.id)),
    ]);

    const remoteThreads = (threadRows ?? []).map((thread) => ({
      id: thread.id,
      listing_id: thread.listing_id,
      donor_id: thread.donor_id,
      recipient_id: thread.recipient_id,
      created_at: thread.created_at,
      last_message: (thread.listings as { title?: string } | null)?.title,
    }));
    const localThreads = overlayThreads(profileId, user?.email).map((thread) => ({
      ...thread,
      last_message: thread.title,
    }));
    const remoteThreadIds = new Set(remoteThreads.map((thread) => thread.id));
    setThreads([
      ...remoteThreads,
      ...localThreads.filter((thread) => !remoteThreadIds.has(thread.id)),
    ]);
  }

  useDataRefresh(
    loadActivity,
    ["profiles", "listings", "donation_requests", "threads", "messages"],
  );

  useEffect(() => {
    void loadActivity();
    // loadActivity intentionally follows the current profile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, user?.email]);

  if (loading) {
    return <p className="px-4 py-10 text-sm text-muted-foreground">Loading profile…</p>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Your Loopify profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to see donations you posted, requests you sent, and pickup chats in Yangon.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auth?next=/profile"
            className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/auth?mode=signup&next=/profile"
            className="inline-flex min-h-12 items-center rounded-full bg-muted px-6 font-medium"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Almost there</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are signed in as {user.email}, but we could not load a profile yet. Try again in a moment.
        </p>
        <Button className="mt-6 rounded-full" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  const mine = myOverlayListings(profile.id, user.email, listings);
  async function saveProfile() {
    if (!profile) return;
    const currentProfile = profile;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim() || currentProfile.display_name,
        bio: bio.trim() || null,
        city: city.trim() || "Yangon, Myanmar",
      })
      .eq("id", currentProfile.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    announceDataChange();
    toast.success("Profile saved");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    await refresh();
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <div className="overflow-hidden rounded-[1.5rem] bg-[#f4f7f1] p-5 md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <img
            src={profile.avatar_url || "/avatars/a1.jpg"}
            alt=""
            className="size-20 rounded-full object-cover ring-2 ring-white"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{profile.display_name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {profile.city}
              </span>
              {profile.verified ? (
                <span className="inline-flex items-center gap-0.5 text-primary">
                  <ShieldCheck className="size-4" /> Verified
                </span>
              ) : null}
              <span className="inline-flex items-center gap-0.5 text-emerald-700">
                <Star className="size-3.5 fill-emerald-600" />
                {Number(profile.rating_avg).toFixed(1)} ({profile.rating_count})
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
            {profile.bio ? <p className="mt-2 text-sm leading-relaxed">{profile.bio}</p> : null}
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { n: mine.length, l: "Donations" },
            { n: requests.length, l: "Requests" },
            { n: threads.length, l: "Chats" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-white px-3 py-3 text-center">
              <p className="text-lg font-semibold">{s.n}</p>
              <p className="text-xs text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-6 rounded-[1.5rem] border border-black/5 p-4 md:p-5">
        <h2 className="text-lg font-semibold">Edit profile</h2>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              className="h-11 rounded-full px-4 text-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-city">City</Label>
            <Input
              id="profile-city"
              className="h-11 rounded-full px-4 text-base"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              className="min-h-24 rounded-2xl px-4 text-base"
              placeholder="What you give, collect, or host in Yangon"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <Button className="h-11 rounded-full px-6" onClick={() => void saveProfile()} disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </section>

      <div className="mt-8 flex gap-2 rounded-full bg-muted p-1">
        {(
          [
            ["donations", "Donations"],
            ["requests", "Requests"],
            ["chats", "Chats"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`h-10 flex-1 rounded-full text-sm font-medium ${
              tab === id ? "bg-white shadow-sm" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "donations" ? (
        <section className="mt-4">
          {mine.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing yet.{" "}
              <Link href="/give" className="text-primary underline">
                Give an item
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {mine.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/listings/${l.id}`}
                    className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3"
                  >
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Package className="size-4 text-primary" />
                      {l.title}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{l.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "requests" ? (
        <section className="mt-4">
          {requests.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">You have not requested a Yangon donation yet.</p>
          ) : (
            <ul className="space-y-2">
              {requests.map((r) => (
                <li key={r.id} className="rounded-2xl border px-4 py-3 text-sm">
                  <p className="font-medium capitalize">{r.status}</p>
                  <p className="text-muted-foreground">{r.message}</p>
                  <Link href={`/listings/${r.listing_id}`} className="mt-1 inline-block text-primary">
                    View listing
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "chats" ? (
        <section className="mt-4">
          {threads.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No collection threads yet.</p>
          ) : (
            <ul className="space-y-2">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/messages/${t.id}`}
                    className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium"
                  >
                    <MessageCircle className="size-4" />
                    {t.last_message ?? "Collection chat"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
