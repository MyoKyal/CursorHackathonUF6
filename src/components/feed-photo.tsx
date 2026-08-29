"use client";

import { useState } from "react";

export function FeedPhoto({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className={`bg-muted ${className ?? ""}`} aria-hidden />;
  }
  return (
    // Local and user-upload URLs; native img avoids Next optimizer 404s on remote hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
