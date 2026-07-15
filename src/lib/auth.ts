import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole, UserRow } from "@/lib/database.types";

// Returns the signed-in user's profile row, or null if not signed in / no row.
// Defensive: never throws — logs and returns null so a misconfigured backend
// degrades to the login screen instead of a 500.
// Wrapped in React cache() so repeated calls within one request/render (e.g. a
// role guard plus the page body) share a single auth + users lookup.
export const getCurrentUser = cache(async (): Promise<UserRow | null> => {
  try {
    const supabase = createClient();

    // Fast path: the middleware already authenticated the session against the
    // auth server and forwarded the user id. Trusting it lets us skip a second
    // network round-trip to the auth server on every navigation.
    let userId: string | null = null;
    try {
      userId = headers().get("x-user-id");
    } catch {
      // headers() is unavailable outside a request scope — fall through.
    }

    // Fallback (e.g. header missing): verify the session directly. getClaims()
    // validates the JWT locally when asymmetric signing keys are enabled,
    // otherwise it falls back to an auth-server check.
    if (!userId) {
      const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims();
      if (claimsError) {
        console.error("[auth] getClaims failed:", claimsError.message);
        return null;
      }
      userId = (claimsData?.claims?.sub as string | undefined) ?? null;
    }

    if (!userId) return null;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      // e.g. schema not migrated, RLS misconfig, or profile row not yet created.
      console.error("[auth] users lookup failed:", error.message);
      return null;
    }

    return (data as UserRow | null) ?? null;
  } catch (err: any) {
    // Never swallow Next.js control-flow errors (redirect / notFound /
    // dynamic-rendering bailout) — re-throw so the framework handles them.
    if (err?.digest || err?.message?.includes("Dynamic server usage")) {
      throw err;
    }
    console.error("[auth] getCurrentUser threw:", err);
    return null;
  }
});

// Requires a signed-in user; redirects to /login otherwise.
export async function requireUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Requires a specific role; redirects to the user's own home otherwise.
export async function requireRole(role: UserRole): Promise<UserRow> {
  const user = await requireUser();
  if (user.role !== role) redirect(homePathForRole(user.role));
  return user;
}

// Requires the user to hold one of the given roles.
export async function requireAnyRole(roles: UserRole[]): Promise<UserRow> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homePathForRole(user.role));
  return user;
}

export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "intern":
      return "/intern";
    case "designer":
      return "/designer";
    case "team_leader":
      return "/leader";
    default:
      return "/login";
  }
}
