"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, CONDITIONS, DEFAULT_CENTER } from "@/lib/categories";
import { rememberListing } from "@/lib/flow-store";
import { createClient } from "@/lib/supabase/client";
import { announceDataChange } from "@/lib/use-data-refresh";
import type { Availability, Category, Listing, ListingType } from "@/lib/types";
import type { ItemAnalysis } from "@/lib/types";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function GiveForm() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [listingType, setListingType] = useState<ListingType>("donate");
  const [condition, setCondition] = useState("Good");
  const [availability, setAvailability] = useState<Availability>("now");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");
  const [kg, setKg] = useState("2");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ItemAnalysis | null>(null);

  async function analyzePhoto(next: File) {
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append("image", next);
      const res = await fetch("/api/analyze-item", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analysis failed");
      const a = json as ItemAnalysis;
      setAnalysis(a);
      setTitle(a.title);
      setCategory(a.category);
      setCondition(a.condition);
      setDescription(a.description);
      const mid = ((a.estimated_kg_min + a.estimated_kg_max) / 2).toFixed(1);
      setKg(mid);
      toast.success(`AI filled the form (${a.provider})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not analyze photo");
    } finally {
      setAnalyzing(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) {
      router.push("/auth?next=/give");
      return;
    }
    if (title.trim().length < 4) {
      toast.error("Add a short title.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    let lat = DEFAULT_CENTER.lat + (Math.random() - 0.5) * 0.03;
    let lng = DEFAULT_CENTER.lng + (Math.random() - 0.5) * 0.03;
    await new Promise<void>((resolve) => {
      if (!navigator.geolocation) return resolve();
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const la = p.coords.latitude;
          const ln = p.coords.longitude;
          if (la >= 16.7 && la <= 17.1 && ln >= 96.05 && ln <= 96.35) {
            lat = la;
            lng = ln;
          }
          resolve();
        },
        () => resolve(),
        { timeout: 4000 },
      );
    });

    const aiBlock = analysis
      ? `\n\nRecommendation: ${analysis.recommendation} — ${analysis.recommendation_detail}${
          analysis.safety_warnings.length
            ? `\nSafety: ${analysis.safety_warnings.join("; ")}`
            : ""
        }${analysis.keywords.length ? `\nKeywords: ${analysis.keywords.join(", ")}` : ""}`
      : "";
    const { data: listing, error } = await supabase
      .from("listings")
      .insert({
        user_id: profile.id,
        title: title.trim(),
        description: (description.trim() || title.trim()) + aiBlock,
        category,
        listing_type: listingType,
        condition,
        availability,
        area_label: area.trim() || profile.city,
        lat,
        lng,
        collection_notes: notes.trim() || null,
        estimated_kg: Number(kg) || 1,
        is_seed: false,
      })
      .select()
      .single();

    if (error || !listing) {
      setBusy(false);
      toast.error(
        error?.message?.includes("Could not find") || error?.code === "PGRST205"
          ? "Run supabase/schema.sql in your project so posts can be saved."
          : error?.message ?? "Could not publish",
      );
      return;
    }

    let photos: string[] = [];
    if (file) {
      const path = `${user.id}/${listing.id}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("listing-photos")
        .upload(path, file, { upsert: true });
      if (upErr) {
        toast.message("Post saved, but photo upload needs the listing-photos bucket.");
      } else {
        const { data: pub } = supabase.storage.from("listing-photos").getPublicUrl(path);
        photos = [pub.publicUrl];
        await supabase.from("listing_photos").insert({
          listing_id: listing.id,
          url: pub.publicUrl,
          sort_order: 0,
        });
      }
    }

    const cached: Listing = {
      id: listing.id,
      user_id: listing.user_id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      listing_type: listing.listing_type,
      condition: listing.condition,
      availability: listing.availability,
      area_label: listing.area_label,
      lat: listing.lat,
      lng: listing.lng,
      collection_notes: listing.collection_notes,
      status: listing.status ?? "open",
      estimated_kg: listing.estimated_kg,
      is_seed: false,
      created_at: listing.created_at ?? new Date().toISOString(),
      photos,
      donor: profile,
      request_count: 0,
      requester_avatars: profile.avatar_url ? [profile.avatar_url] : [],
    };
    rememberListing(cached);

    setBusy(false);
    toast.success("Your post is live on the feed.");
    announceDataChange();
    router.push(`/listings/${listing.id}`);
    router.refresh();
  }

  if (!loading && !user) {
    return (
      <div className="px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Sign in to give</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Neighbors need a real account so you can review requests and message.
        </p>
        <Button className="mt-6 min-h-12 rounded-full px-6" onClick={() => router.push("/auth?next=/give")}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 px-4 pb-8 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Give an item</h1>
      <p className="text-sm text-muted-foreground">
        Photograph first. AI suggests title, category, condition, weight, and whether to
        reuse, repair, or recycle. Donation is the default; exchange is optional.
      </p>
      <div>
        <Label htmlFor="photo">Photo</Label>
        <Input
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="mt-1 min-h-12 rounded-2xl pt-2"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            setFile(next);
            setAnalysis(null);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(next ? URL.createObjectURL(next) : null);
            if (next) analyzePhoto(next);
          }}
        />
        {preview ? (
          <img src={preview} alt="" className="mt-3 h-40 w-full rounded-2xl object-cover" />
        ) : null}
        {analyzing ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-primary">
            <Loader2 className="size-4 animate-spin" /> Reading the photo…
          </p>
        ) : null}
        {analysis ? (
          <div className="mt-3 space-y-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-950">
            <p className="flex items-center gap-1 font-semibold">
              <Sparkles className="size-4" />
              {analysis.recommendation === "recycle"
                ? "Recycle"
                : analysis.recommendation === "repair"
                  ? "Repair"
                  : "Reuse"}
            </p>
            <p>{analysis.recommendation_detail}</p>
            <p className="text-xs">
              Weight about {analysis.estimated_kg_min}–{analysis.estimated_kg_max} kg
            </p>
            {analysis.safety_warnings.length ? (
              <p className="text-amber-800">Safety: {analysis.safety_warnings.join("; ")}</p>
            ) : null}
            {analysis.keywords.length ? (
              <p className="text-xs text-emerald-800">
                Keywords: {analysis.keywords.join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setListingType("donate")}
          className={`min-h-12 rounded-full text-sm font-medium ${listingType === "donate" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          Donate
        </button>
        <button
          type="button"
          onClick={() => setListingType("exchange")}
          className={`min-h-12 rounded-full text-sm font-medium ${listingType === "exchange" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          Exchange
        </button>
      </div>
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          className="mt-1 min-h-12 rounded-2xl text-base"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bag of plastic bottles"
        />
      </div>
      <div>
        <Label htmlFor="desc">Details</Label>
        <Textarea
          id="desc"
          className="mt-1 min-h-28 rounded-2xl text-base"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Condition, quantity, and why it should be reused or recycled — not dumped."
        />
      </div>
      <div>
        <Label>Category</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id as Category)}
              className={`h-10 rounded-full px-3 text-sm ${category === c.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="cond">Condition</Label>
        <select
          id="cond"
          className="mt-1 h-12 w-full rounded-2xl bg-muted px-3 text-base"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          {CONDITIONS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>When can someone collect?</Label>
        <select
          className="mt-1 h-12 w-full rounded-2xl bg-muted px-3 text-base"
          value={availability}
          onChange={(e) => setAvailability(e.target.value as Availability)}
        >
          <option value="now">Available now</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="weekend">This weekend</option>
        </select>
      </div>
      <div>
        <Label htmlFor="area">Neighborhood</Label>
        <Input
          id="area"
          className="mt-1 min-h-12 rounded-2xl text-base"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Bahan, Kamayut, Insein…"
        />
      </div>
      <div>
        <Label htmlFor="notes">Collection notes</Label>
        <Textarea
          id="notes"
          className="mt-1 rounded-2xl text-base"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Gate pickup, sacks under the stair, call when you reach the corner…"
        />
      </div>
      <div>
        <Label htmlFor="kg">Estimated weight (kg)</Label>
        <Input
          id="kg"
          inputMode="decimal"
          className="mt-1 min-h-12 rounded-2xl text-base"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
        />
      </div>
      <Button type="submit" className="min-h-12 w-full rounded-full text-base" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        Publish to the feed
      </Button>
    </form>
  );
}
