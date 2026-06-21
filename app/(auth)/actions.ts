"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/db/supabase/server";
import { isSupabaseConfigured } from "@/lib/db/env";

export interface AuthState {
  error?: string;
  notice?: string;
}

const NOT_CONFIGURED = "Supabase is not configured. Add the env vars to enable accounts.";

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email")),
    password: String(form.get("password")),
    options: {
      data: { full_name: String(form.get("full_name")), org_name: String(form.get("org_name")) },
    },
  });
  if (error) return { error: error.message };
  // Email confirmation on → no session yet.
  if (!data.session) return { notice: "Check your email to confirm your account, then sign in." };
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
