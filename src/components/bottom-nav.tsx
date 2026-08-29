"use client";

import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useDataRefresh } from "@/lib/use-data-refresh";
import {
  ArrowLeft,
  Bell,
  Compass,
  MessageCircle,
  Plus,
  Sprout,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { href: "/", label: "Feed", icon: Compass, primary: true },
  { href: "/impact", label: "Impact", icon: Sprout },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/messages", label: "Messages", icon: MessageCircle },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadUnreadCount() {
    if (!profile) {
      setUnreadCount(0);
      return;
    }
    const supabase = createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("read", false);
    setUnreadCount(count ?? 0);
  }

  useDataRefresh(loadUnreadCount, ["notifications"]);
  useEffect(() => {
    void loadUnreadCount();
    // loadUnreadCount intentionally follows the current profile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative mx-auto flex max-w-lg items-end justify-around px-2 pt-1">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 pb-2"
              >
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full transition-colors",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={2.2} />
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-12 min-w-[3.25rem] flex-col items-center justify-center gap-0.5 pb-2 pt-1"
            >
              <span className="relative">
                <Icon
                  className={cn(
                    "size-6",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {item.href === "/notifications" && user && unreadCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1 min-w-4 rounded-full bg-red-500 px-0.5 text-center text-[9px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/give"
        className="absolute -top-5 right-4 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
        aria-label="Give an item"
      >
        <Plus className="size-5" />
      </Link>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const showBack = pathname !== "/";

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-white md:max-w-none">
      <SiteHeader />
      <div
        className="mx-auto min-h-dvh max-w-lg pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:max-w-6xl md:pb-8"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {showBack ? (
          <div className="flex h-12 items-center px-4 md:px-0">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) router.back();
                else router.push("/");
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-muted"
              aria-label="Go back"
            >
              <ArrowLeft className="size-5" />
              Back
            </button>
          </div>
        ) : null}
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
