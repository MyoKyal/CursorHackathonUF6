"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";

const DATA_EVENT = "loopify-data-changed";

export function announceDataChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DATA_EVENT));
  }
}

export function useDataRefresh(
  load: () => void | Promise<void>,
  tables: string[],
  intervalMs = 15000,
) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const tableKey = tables.join(",");

  useEffect(() => {
    let active = true;
    const run = () => {
      if (active) void loadRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };

    run();
    window.addEventListener(DATA_EVENT, run);
    window.addEventListener("loopify-flow", run);
    window.addEventListener("storage", run);
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(run, intervalMs);

    const supabase = createClient();
    const channel = supabase.channel(`live-${tableKey}-${crypto.randomUUID()}`);
    for (const table of tableKey.split(",").filter(Boolean)) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        run,
      );
    }
    channel.subscribe();

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(DATA_EVENT, run);
      window.removeEventListener("loopify-flow", run);
      window.removeEventListener("storage", run);
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [tableKey, intervalMs]);
}
