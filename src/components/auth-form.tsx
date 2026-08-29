"use client";

import { useAuth } from "@/components/auth-provider";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function AuthForm() {
  const search = useSearchParams();
  const next = search.get("next") || "/profile";
  const router = useRouter();
  const { user, profile, loading, refresh } = useAuth();
  const initialMode = search.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(search.get("mode") === "signup" ? "signup" : "signin");
  }, [search]);

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(next);
    }
  }, [loading, user, profile, next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        if (!data.session) {
          toast.success("Account created. Check your inbox to confirm, then sign in.");
          setMode("signin");
          return;
        }
        await refresh();
        toast.success("Welcome to Loopify.");
        router.push(next);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Signed in.");
      router.push(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8 md:py-12">
      <div className="mb-6 flex justify-center">
        <Link href="/">
          <BrandMark />
        </Link>
      </div>
      <div className="rounded-[1.5rem] border border-black/5 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-5 grid grid-cols-2 rounded-full bg-muted p-1">
          <button
            type="button"
            className={`h-10 rounded-full text-sm font-medium ${
              mode === "signin" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`h-10 rounded-full text-sm font-medium ${
              mode === "signup" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Join Loopify"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to give items, request donations, and keep your Yangon profile."
            : "Create a profile to post donations and chat about pickup in Yangon."}
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {mode === "signup" ? (
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Your name</Label>
              <Input
                id="display-name"
                className="min-h-12 rounded-2xl px-4 text-base"
                placeholder="Su Su Win"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              className="min-h-12 rounded-2xl px-4 text-base"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              className="min-h-12 rounded-2xl px-4 text-base"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "At least 6 characters" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="min-h-12 w-full rounded-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Demo accounts
        </p>
        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              className="rounded-2xl bg-muted px-3 py-2.5 text-left text-sm"
              onClick={() => {
                setMode("signin");
                setEmail(a.email);
                setPassword(a.password);
              }}
            >
              <span className="font-medium">{a.name}</span>
              <span className="block text-xs text-muted-foreground">{a.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
