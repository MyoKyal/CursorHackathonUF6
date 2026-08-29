"use client";

import { useAuth } from "@/components/auth-provider";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Feed" },
  { href: "/events", label: "Events" },
  { href: "/impact", label: "Impact" },
  { href: "/messages", label: "Messages" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const signedIn = mounted && Boolean(user);
  return (
    <header className="sticky top-0 z-40 hidden border-b border-black/5 bg-white/95 backdrop-blur-md md:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <Link href="/" className="shrink-0">
          <BrandMark compact />
        </Link>
        <nav className="flex flex-1 items-center justify-center gap-6 text-sm font-medium">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(active ? "text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/give"
            className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Give
          </Link>
          <Link
            href={signedIn ? "/profile" : "/auth?next=/profile"}
            className="inline-flex h-10 items-center rounded-full bg-muted px-4 text-sm font-medium"
            suppressHydrationWarning
          >
            {signedIn ? (profile?.display_name ?? "Profile") : "Profile"}
          </Link>
        </div>
      </div>
    </header>
  );
}
