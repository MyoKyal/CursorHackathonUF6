"use client";

import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import { announceDataChange, useDataRefresh } from "@/lib/use-data-refresh";

const SAMPLE: AppNotification[] = [
  {
    id: "n1",
    profile_id: "demo",
    title: "Bottles waiting in Bahan",
    body: "Su Su posted sacks of rinsed PET. A volunteer crew can take them to a Yangon recovery workshop.",
    href: "/listings/a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1",
    read: false,
    created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: "n2",
    profile_id: "demo",
    title: "Kandawgyi lakeside cleanup",
    body: "Yangon Green Loop still needs hands to sort recyclables after the walk.",
    href: "/events/e1111111-e111-e111-e111-e11111111111",
    read: false,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

export function NotificationsView() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<AppNotification[]>(SAMPLE);

  async function load() {
    if (!profile) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as AppNotification[]);
  }

  useDataRefresh(load, ["notifications"]);

  useEffect(() => {
    if (!profile) {
      setItems(SAMPLE);
      return;
    }
    void load();
    // load intentionally follows the current profile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function markRead(notification: AppNotification) {
    if (!profile || notification.read) return;
    setItems((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id)
      .eq("profile_id", profile.id);
    if (error) {
      setItems((current) =>
        current.map((item) => (item.id === notification.id ? notification : item)),
      );
      return;
    }
    announceDataChange();
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      {!user ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Community updates below. Sign in to see requests on your posts.
        </p>
      ) : null}
      <ul className="mt-4 space-y-2">
        {items.map((n) => (
          <li key={n.id}>
            <Link
              href={n.href || "/explore"}
              onClick={() => void markRead(n)}
              className={`block rounded-2xl p-4 ${n.read ? "bg-muted/40" : "bg-emerald-50"}`}
            >
              <p className="font-medium">{n.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                <RelativeTime value={n.created_at} />
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {!user ? (
        <Link
          href="/auth?next=/notifications"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground"
        >
          Sign in
        </Link>
      ) : null}
    </div>
  );
}

function RelativeTime({ value }: { value: string }) {
  const [label, setLabel] = useState("Recently");
  useEffect(() => {
    setLabel(formatDistanceToNow(new Date(value), { addSuffix: true }));
  }, [value]);
  return label;
}
