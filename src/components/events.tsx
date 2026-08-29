"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchEvent, fetchEvents } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { announceDataChange, useDataRefresh } from "@/lib/use-data-refresh";
import { DEFAULT_CENTER } from "@/lib/categories";
import type { CommunityEvent } from "@/lib/types";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function EventsList() {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await fetchEvents();
    setEvents(result.events);
    setError(result.error);
  }

  useDataRefresh(load, ["events", "event_rsvps"]);

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Community events</h1>
        <Link
          href="/events/new"
          className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Create
        </Link>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-muted-foreground">Showing community events while live data is connecting.</p>
      ) : null}
      <ul className="mt-4 space-y-4">
        {events.map((e) => (
          <li key={e.id}>
            <Link href={`/events/${e.id}`} className="block overflow-hidden rounded-[1.2rem]">
              {e.photo_url ? (
                <img src={e.photo_url} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="h-24 bg-muted" />
              )}
              <div className="bg-muted/40 p-3">
                <p className="font-semibold">{e.title}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {format(new Date(e.starts_at), "EEE, MMM d · p")} · {e.area_label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{e.going_count} going · by {e.host.display_name}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EventDetail({ id }: { id: string }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [going, setGoing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchEvent(id).then(setEvent);
    if (!profile) return;
    const supabase = createClient();
    supabase
      .from("event_rsvps")
      .select("event_id")
      .eq("event_id", id)
      .eq("profile_id", profile.id)
      .maybeSingle()
      .then(({ data }) => setGoing(Boolean(data)));
  }, [id, profile]);

  async function rsvp() {
    if (!user || !profile) {
      router.push(`/auth?next=/events/${id}`);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    if (going) {
      await supabase.from("event_rsvps").delete().eq("event_id", id).eq("profile_id", profile.id);
      setGoing(false);
    } else {
      const { error } = await supabase.from("event_rsvps").insert({
        event_id: id,
        profile_id: profile.id,
      });
      if (error) toast.error(error.message);
      else setGoing(true);
    }
    setBusy(false);
    setEvent(await fetchEvent(id));
    announceDataChange();
  }

  if (!event) {
    return (
      <p className="px-6 py-16 text-center">
        Event not found. <Link href="/events" className="text-primary">All events</Link>
      </p>
    );
  }

  return (
    <div>
      {event.photo_url ? (
        <img src={event.photo_url} alt="" className="aspect-[16/10] w-full object-cover" />
      ) : null}
      <div className="px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {event.category.replace("-", " ")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{event.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {format(new Date(event.starts_at), "EEEE, MMM d · p")} · {event.area_label}
        </p>
        <p className="mt-4 text-[15px] leading-relaxed">{event.description}</p>
        <p className="mt-3 text-sm">
          Hosted by {event.host.display_name}
          {event.host.verified ? " (verified org)" : ""} · {event.going_count} going
        </p>
        <Button className="mt-6 min-h-12 w-full rounded-full" disabled={busy} onClick={rsvp}>
          {going ? "Cancel RSVP" : "Register as volunteer"}
        </Button>
      </div>
    </div>
  );
}

export function EventCreateForm() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState("");
  const [area, setArea] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) {
      router.push("/auth?next=/events/new");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    let photo_url: string | null = null;
    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: up } = await supabase.storage.from("event-photos").upload(path, file);
      if (!up) {
        photo_url = supabase.storage.from("event-photos").getPublicUrl(path).data.publicUrl;
      }
    }
    const { data, error } = await supabase
      .from("events")
      .insert({
        host_id: profile.id,
        title: title.trim(),
        description: description.trim(),
        category: "community",
        starts_at: when ? new Date(when).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        area_label: area || profile.city,
        lat: DEFAULT_CENTER.lat,
        lng: DEFAULT_CENTER.lng,
        photo_url,
        is_seed: false,
      })
      .select()
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not create event");
      return;
    }
    announceDataChange();
    router.push(`/events/${data.id}`);
  }

  if (!loading && !user) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="font-medium">Sign in to host an event</p>
        <Button className="mt-4 rounded-full" onClick={() => router.push("/auth?next=/events/new")}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 px-4 py-4">
      <h1 className="text-2xl font-semibold">New event</h1>
      <Input className="min-h-12 rounded-2xl text-base" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea className="min-h-28 rounded-2xl text-base" placeholder="What will volunteers do?" value={description} onChange={(e) => setDescription(e.target.value)} required />
      <Input className="min-h-12 rounded-2xl text-base" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      <Input className="min-h-12 rounded-2xl text-base" placeholder="Neighborhood" value={area} onChange={(e) => setArea(e.target.value)} />
      <Input className="min-h-12 rounded-2xl pt-2" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button type="submit" className="min-h-12 w-full rounded-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        Publish event
      </Button>
    </form>
  );
}
