"use client";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  showWordmark = true,
  compact = false,
}: {
  className?: string;
  showWordmark?: boolean;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src="/loopify-logo.jpg"
        alt=""
        className={cn(
          "rounded-full object-cover shadow-sm ring-1 ring-black/5",
          compact ? "size-8" : "size-11",
        )}
      />
      {showWordmark ? (
        <span className="leading-tight">
          <span className={cn("block font-semibold tracking-tight text-[#2D5A27]", compact ? "text-base" : "text-lg")}>
            Loopify
          </span>
          {!compact ? (
            <span className="block text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
              Recycle. Exchange. Renew.
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
