import type { Availability, Category } from "./types";

export const CATEGORIES: {
  id: Category | "all";
  label: string;
  icon: string;
}[] = [
  { id: "all", label: "All", icon: "✦" },
  { id: "clothes", label: "Clothes", icon: "👕" },
  { id: "books", label: "Books", icon: "📚" },
  { id: "electronics", label: "Electronics", icon: "🔌" },
  { id: "furniture", label: "Furniture", icon: "🪑" },
  { id: "food", label: "Food", icon: "🥫" },
  { id: "other", label: "Other", icon: "♻️" },
];

export const AVAILABILITY_CHIPS: { id: Availability | "upcoming"; label: string }[] =
  [
    { id: "upcoming", label: "Upcoming" },
    { id: "now", label: "Available now" },
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "weekend", label: "Weekend" },
  ];

export const CONDITIONS = ["Like new", "Good", "Fair", "For parts / recycle"];

export function categoryLabel(id: Category) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Downtown Yangon */
export const DEFAULT_CENTER = { lat: 16.8409, lng: 96.1735 };
