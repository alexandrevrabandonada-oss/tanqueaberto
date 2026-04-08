import { redirect } from "next/navigation";
import type { Route } from "next";

import { getStationEditorSessionFromCookie } from "@/lib/auth/station-editor-session";
import { logRuntimeIssue } from "@/lib/observability/runtime-issues";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminRole = "admin" | "station_editor";

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
}

interface AdminLookupRow {
  user_id: string;
  email?: string | null;
  role?: string | null;
}

const ADMIN_LOGIN_ROUTE = "/admin/login" as Route;
const STATION_EDITOR_LOGIN_ROUTE = "/editor" as Route;

function isLegacyAdminUsersColumnError(message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("admin_users.email")
    || normalized.includes("admin_users.role")
    || normalized.includes("column email does not exist")
    || normalized.includes("column role does not exist");
}

async function lookupAdminUser(authUser: { id: string; email?: string | null }) {
  const supabase = await createSupabaseServerClient();
  const normalizedEmail = authUser.email ? authUser.email.trim().toLowerCase() : "";

  const fullLookup = await supabase
    .from("admin_users")
    .select("user_id,email,role")
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (!fullLookup.error) {
    if (!fullLookup.data?.user_id) {
      if (normalizedEmail) {
        const byEmailLookup = await supabase
          .from("admin_users")
          .select("user_id,email,role")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (!byEmailLookup.error) {
          return {
            data: byEmailLookup.data ? ({
              user_id: byEmailLookup.data.user_id ?? authUser.id,
              email: byEmailLookup.data.email ?? normalizedEmail,
              role: byEmailLookup.data.role ?? "admin"
            } satisfies AdminLookupRow) : null,
            error: null
          };
        }

        if (!isLegacyAdminUsersColumnError(byEmailLookup.error.message)) {
          return byEmailLookup;
        }

        const byEmailLegacyLookup = await supabase
          .from("admin_users")
          .select("email")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (!byEmailLegacyLookup.error) {
          return {
            data: byEmailLegacyLookup.data ? ({
              user_id: authUser.id,
              email: normalizedEmail,
              role: "admin"
            } satisfies AdminLookupRow) : null,
            error: null
          };
        }

        if (!isLegacyAdminUsersColumnError(byEmailLegacyLookup.error.message)) {
          return byEmailLegacyLookup;
        }
      }
    }

    return {
      data: fullLookup.data ? ({
        user_id: fullLookup.data.user_id,
        email: fullLookup.data.email || normalizedEmail || "no-email@admin.local",
        role: fullLookup.data.role ?? "admin"
      } satisfies AdminLookupRow) : null,
      error: null
    };
  }

  if (!isLegacyAdminUsersColumnError(fullLookup.error.message)) {
    return fullLookup;
  }

  const emailLookup = await supabase
    .from("admin_users")
    .select("user_id,email")
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (!emailLookup.error) {
    return {
      data: emailLookup.data ? ({
        user_id: emailLookup.data.user_id,
        email: emailLookup.data.email || normalizedEmail || "no-email@admin.local",
        role: "admin"
      } satisfies AdminLookupRow) : null,
      error: null
    };
  }

  if (!isLegacyAdminUsersColumnError(emailLookup.error.message)) {
    return emailLookup;
  }

  const legacyLookup = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (legacyLookup.error) {
    return legacyLookup;
  }

  return {
    data: legacyLookup.data ? ({
      user_id: legacyLookup.data.user_id,
      email: normalizedEmail || "no-email@admin.local",
      role: "admin"
    } satisfies AdminLookupRow) : null,
    error: null
  };
}

function normalizeRole(role: string | null | undefined): AdminRole {
  return role === "station_editor" ? "station_editor" : "admin";
}

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user?.id) {
    return null;
  }

  const { data, error } = await lookupAdminUser({ id: userResult.user.id, email: userResult.user.email });

  if (error) {
    logRuntimeIssue("Failed to verify current admin user", error, {
      scope: "admin",
      surface: "auth.getCurrentAdminUser",
      fallback: "treat-as-logged-out",
      optional: true,
      schemaSensitive: true
    });
    await supabase.auth.signOut();
    return null;
  }

  if (!data?.user_id) {
    return null;
  }

  return { id: data.user_id, email: data.email || userResult.user.email || "no-email@admin.local", role: normalizeRole(data.role) };
}

async function requireUserForRoute(allowedRoles: AdminRole[], loginRoute: Route): Promise<AdminUser> {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user?.id) {
    redirect(`${loginRoute}?error=session_expired` as Route);
  }

  const { data, error } = await lookupAdminUser({ id: userResult.user.id, email: userResult.user.email });

  if (error) {
    logRuntimeIssue("Failed to verify admin access for protected route", error, {
      scope: "admin",
      surface: "auth.requireUserForRoute",
      fallback: "redirect-login",
      optional: true,
      schemaSensitive: true
    });
    await supabase.auth.signOut();
    redirect(`${loginRoute}?error=session_expired` as Route);
  }

  if (!data?.user_id) {
    await supabase.auth.signOut();
    redirect(`${loginRoute}?error=not_authorized` as Route);
  }

  const role = normalizeRole(data.role);
  if (!allowedRoles.includes(role)) {
    redirect(`${loginRoute}?error=not_authorized` as Route);
  }

  return { id: data.user_id, email: data.email || userResult.user.email || "no-email@admin.local", role };
}

async function resolveAuthAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user?.id) {
    return null;
  }

  const { data, error } = await lookupAdminUser({ id: userResult.user.id, email: userResult.user.email });
  if (error) {
    logRuntimeIssue("Failed to resolve auth admin user", error, {
      scope: "admin",
      surface: "auth.resolveAuthAdminUser",
      fallback: "treat-as-logged-out",
      optional: true,
      schemaSensitive: true
    });
    await supabase.auth.signOut();
    return null;
  }

  if (!data?.user_id) {
    return null;
  }

  return { id: data.user_id, email: data.email || userResult.user.email || "no-email@admin.local", role: normalizeRole(data.role) };
}

export async function requireAdminUser() {
  return requireUserForRoute(["admin"], ADMIN_LOGIN_ROUTE);
}

function buildStationEditorLoginRedirect(returnTo?: string | null) {
  const params = new URLSearchParams({ error: "session_expired" });
  const safeReturnTo = typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "";

  if (safeReturnTo) {
    params.set("returnTo", safeReturnTo);
  }

  return `${STATION_EDITOR_LOGIN_ROUTE}?${params.toString()}` as Route;
}

export async function requireStationEditorUser(returnTo?: string | null) {
  const authUser = await resolveAuthAdminUser();
  if (authUser && (authUser.role === "admin" || authUser.role === "station_editor")) {
    return authUser;
  }

  const lightSession = await getStationEditorSessionFromCookie();
  if (lightSession) {
    const inviteCode = lightSession.inviteCode ? `#${lightSession.inviteCode}` : "";
    return {
      id: lightSession.id,
      email: `station-editor:${lightSession.displayName}${inviteCode}`,
      role: "station_editor"
    };
  }

  redirect(buildStationEditorLoginRedirect(returnTo));
}

