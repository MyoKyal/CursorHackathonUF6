"use client";

import type { CommunityEvent, Listing } from "@/lib/types";
import {
  createLeafletContext,
  LeafletContext,
  type LeafletContextInterface,
} from "@react-leaflet/core";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { DEFAULT_CENTER } from "@/lib/categories";

const pin = new L.DivIcon({
  className: "",
  html: `<span style="display:block;width:18px;height:18px;background:#059669;border:2px solid white;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const eventPin = new L.DivIcon({
  className: "",
  html: `<span style="display:block;width:18px;height:18px;background:#0f766e;border:2px solid white;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.25)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function StableMapRoot({ children }: { children: ReactNode }) {
  const mapRef = useRef<L.Map | null>(null);
  const [context, setContext] = useState<LeafletContextInterface | null>(null);

  const removeMap = useCallback((map: L.Map) => {
    // A ref cleanup can run more than once during Fast Refresh. Only the
    // callback that owns the current instance may tear it down.
    if (mapRef.current !== map) return;
    mapRef.current = null;
    setContext(null);
    map.remove();
  }, []);

  const attachMap = useCallback(
    (node: HTMLDivElement | null) => {
      if (node === null) {
        const map = mapRef.current;
        if (map) removeMap(map);
        return;
      }

      // React 19 replays callback refs in development. Resetting mapRef in the
      // returned cleanup lets this second attachment create a fresh Leaflet
      // instance instead of retaining a map whose panes were already removed.
      const map = new L.Map(node, { scrollWheelZoom: true });
      mapRef.current = map;
      map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12);
      setContext(createLeafletContext(map));

      return () => removeMap(map);
    },
    [removeMap],
  );

  return (
    <div ref={attachMap} className="h-full w-full">
      {context ? <LeafletContext value={context}>{children}</LeafletContext> : null}
    </div>
  );
}

function Fit({ listings, events }: { listings: Listing[]; events: CommunityEvent[] }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = [
      ...listings.map((l) => [l.lat, l.lng] as [number, number]),
      ...events.map((e) => [e.lat, e.lng] as [number, number]),
    ];
    if (pts.length) {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 13 });
    }
  }, [listings, events, map]);
  return null;
}

export default function ExploreMap({
  listings,
  events,
}: {
  listings: Listing[];
  events: CommunityEvent[];
}) {
  return (
    <div className="h-[calc(100dvh-12rem)] min-h-[420px] w-full overflow-hidden rounded-none md:rounded-2xl">
      <StableMapRoot>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Fit listings={listings} events={events} />
        {listings.map((l) => (
          <Marker key={l.id} position={[l.lat, l.lng]} icon={pin}>
            <Popup>
              <Link href={`/listings/${l.id}`} className="font-semibold text-emerald-800">
                {l.title}
              </Link>
              <div className="text-xs text-neutral-600">{l.area_label}</div>
            </Popup>
          </Marker>
        ))}
        {events.map((e) => (
          <Marker key={e.id} position={[e.lat, e.lng]} icon={eventPin}>
            <Popup>
              <Link href={`/events/${e.id}`} className="font-semibold text-emerald-800">
                {e.title}
              </Link>
              <div className="text-xs text-neutral-600">{e.area_label}</div>
            </Popup>
          </Marker>
        ))}
      </StableMapRoot>
    </div>
  );
}
