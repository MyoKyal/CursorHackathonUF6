"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { overlayMessages, overlayThreads, addOverlayMessage, completeListing, loadFlow } from "@/lib/flow-store";
import type { ChatMessage, Thread } from "@/lib/types";
import { announceDataChange, useDataRefresh } from "@/lib/use-data-refresh";
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function MessageList() {
  const { profile, user, loading } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);

  async function load() {
    if (!profile) {
      setThreads(overlayThreads("", user?.email));
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("threads")
      .select("*, listings(title)")
      .or(`donor_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
      .order("created_at", { ascending: false });
    const remote = (data ?? []).map((t) => ({
      id: t.id,
      listing_id: t.listing_id,
      donor_id: t.donor_id,
      recipient_id: t.recipient_id,
      created_at: t.created_at,
      last_message: (t.listings as { title?: string } | null)?.title,
    }));
    const local = overlayThreads(profile.id, user?.email).map((t) => ({
      ...t,
      last_message: t.title ?? "Pickup chat",
    }));
    const have = new Set(remote.map((t) => t.id));
    setThreads([...remote, ...local.filter((t) => !have.has(t.id))]);
  }

  useDataRefresh(load, ["threads", "messages", "listings"]);

  useEffect(() => {
    void load();
    // load intentionally follows the current signed-in profile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user?.email]);

  if (loading) return <p className="px-4 py-10 text-sm text-muted-foreground">Loading…</p>;
  if (!user) {
    return (
      <div className="px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Messages</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to arrange pickups with donors and volunteers.</p>
        <Link
          href="/auth?next=/messages"
          className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
      {threads.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No threads yet. Request a donation or choose a recipient on your own listing.
        </p>
      ) : (
        <ul className="mt-4 divide-y">
          {threads.map((t) => (
            <li key={t.id}>
              <Link href={`/messages/${t.id}`} className="block min-h-14 py-3">
                <p className="font-medium">{t.last_message ?? "Pickup chat"}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(t.created_at), "MMM d")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ThreadView({ threadId }: { threadId: string }) {
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [listingId, setListingId] = useState<string | null>(null);

  async function load() {
    const localThread = loadFlow().threads.find((t) => t.id === threadId);
    if (localThread) setListingId(localThread.listing_id);
    const localMsgs = overlayMessages(threadId);
    const supabase = createClient();
    const { data: thread } = await supabase.from("threads").select("*").eq("id", threadId).maybeSingle();
    if (thread) setListingId(thread.listing_id);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    const remote = (data ?? []) as ChatMessage[];
    const have = new Set(remote.map((m) => m.id));
    setMessages([...remote, ...localMsgs.filter((m) => !have.has(m.id))].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)));
  }

  useDataRefresh(load, ["threads", "messages", "listings"]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !body.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: profile.id,
      body: body.trim(),
    });
    if (error) {
      if (!user?.email?.endsWith("@loopify.demo")) {
        toast.error(error.message);
        return;
      }
      addOverlayMessage(threadId, profile.id, body.trim());
      toast.message("Saved in this demo session.");
    } else {
      announceDataChange();
    }
    setBody("");
    load();
  }

  if (!user) {
    return (
      <p className="px-4 py-10 text-sm">
        <Link href="/auth" className="text-primary">Sign in</Link> to chat.
      </p>
    );
  }

  return (
    <div className="flex min-h-[70dvh] flex-col px-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Collection chat</h1>
        {listingId ? (
          <div className="flex gap-3">
            <Link href={`/listings/${listingId}`} className="text-sm text-primary">
              Listing
            </Link>
            <button
              type="button"
              className="text-sm font-medium text-primary"
              onClick={async () => {
                const supabase = createClient();
                const { error } = await supabase
                  .from("listings")
                  .update({ status: "completed" })
                  .eq("id", listingId);
                if (error && user?.email?.endsWith("@loopify.demo")) {
                  completeListing(listingId);
                  toast.message("Saved in this demo session.");
                } else if (error) {
                  toast.error(error.message);
                  return;
                }
                announceDataChange();
                toast.success("Pickup marked complete.");
              }}
            >
              Confirm pickup
            </button>
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex-1 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              m.sender_id === profile?.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {m.body}
            <div className="mt-1 text-xs opacity-70">
              {format(new Date(m.created_at), "p")}
            </div>
          </div>
        ))}
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Say when you can pick up, and where you will take the item.</p>
        ) : null}
      </div>
      <form onSubmit={send} className="sticky bottom-0 flex gap-2 bg-white py-3">
        <Input
          className="min-h-12 flex-1 rounded-full text-base"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message…"
        />
        <Button type="submit" className="min-h-12 rounded-full px-5">
          Send
        </Button>
      </form>
    </div>
  );
}
