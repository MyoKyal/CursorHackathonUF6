"use client";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  refresh: async () => {},
});

function mapRow(row: Record<string, unknown> | null): Profile | null {
  if (!row) return null;
  return {
    id: row.id as string,
    auth_id: (row.auth_id as string | null) ?? null,
    display_name: (row.display_name as string) || "Neighbor",
    bio: (row.bio as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    is_org: Boolean(row.is_org),
    verified: Boolean(row.verified),
    city: (row.city as string) || "Yangon, Myanmar",
    rating_avg: Number(row.rating_avg ?? 5),
    rating_count: Number(row.rating_count ?? 0),
  };
}

async function ensureProfile(user: User): Promise<Profile | null> {
  const supabase = createClient();
  const { data: byId } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (byId) return mapRow(byId as Record<string, unknown>);

  const { data: byAuth } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (byAuth) return mapRow(byAuth as Record<string, unknown>);

  const display =
    (user.user_metadata?.display_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Neighbor";
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      auth_id: user.id,
      display_name: display,
    },
    { onConflict: "id" },
  );
  if (error) {
    console.error("Failed to create profile", error.message);
  }
  const { data: again } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return mapRow((again as Record<string, unknown> | null) ?? null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    setUser(u);
    if (!u) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      setProfile(await ensureProfile(u));
    } catch (err) {
      console.error(err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      void load();
    });
    return () => subscription.unsubscribe();
  }, [load]);

  const value = useMemo(
    () => ({ user, profile, loading, refresh: load }),
    [user, profile, loading, load],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
