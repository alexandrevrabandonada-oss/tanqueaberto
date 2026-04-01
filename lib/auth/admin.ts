import { redirect } from "next/navigation";
import type { Route } from "next";

import { clearStationEditorSessionCookie, getStationEditorSessionFromCookie } from "@/lib/auth/station-editor-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminRole = "admin" | "station_editor";

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
}

const ADMIN_LOGIN_ROUTE = "/admin/login" as Route;
const STATION_EDITOR_LOGIN_ROUTE = "/editor" as Route;

async function lookupAdminUser(email: string) {
  const supabase = await createSupabaseServerClient();
  const normalizedEmail = email.trim().toLowerCase();

  return supabase.from("admin_users").select("user_id,email,role").eq("email", normalizedEmail).maybeSingle();
}

function normalizeRole(role: string | null | undefined): AdminRole {
  return role === "station_editor" ? "station_editor" : "admin";
}

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user?.email || !userResult.user.id) {
    return null;
  }

  const { data, error } = await lookupAdminUser(userResult.user.email);

  if (error) {
    throw new Error(`Failed to verify admin access: ${error.message}`);
  }

  if (!data?.email || !data?.user_id) {
    return null;
  }

  return { id: data.user_id, email: data.email, role: normalizeRole(data.role) };
}

async function requireUserForRoute(allowedRoles: AdminRole[], loginRoute: Route): Promise<AdminUser> {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user?.email || !userResult.user.id) {
    redirect(`${loginRoute}?error=session_expired` as Route);
  }

  const { data, error } = await lookupAdminUser(userResult.user.email);

  if (error) {
    throw new Error(`Failed to verify admin access: ${error.message}`);
  }

  if (!data?.email || !data?.user_id) {
    await supabase.auth.signOut();
    redirect(`${loginRoute}?error=not_authorized` as Route);
  }

  const role = normalizeRole(data.role);
  if (!allowedRoles.includes(role)) {
    redirect(`${loginRoute}?error=not_authorized` as Route);
  }

  return { id: data.user_id, email: data.email, role };
}

async function resolveAuthAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user?.email || !userResult.user.id) {
    return null;
  }

  const { data, error } = await lookupAdminUser(userResult.user.email);
  if (error) {
    throw new Error(`Failed to verify admin access: ${error.message}`);
  }

  if (!data?.email || !data?.user_id) {
    return null;
  }

  return { id: data.user_id, email: data.email, role: normalizeRole(data.role) };
}

export async function requireAdminUser() {
  return requireUserForRoute(["admin"], ADMIN_LOGIN_ROUTE);
}

export async function requireStationEditorUser() {
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

  await clearStationEditorSessionCookie();
  redirect(`${STATION_EDITOR_LOGIN_ROUTE}?error=session_expired` as Route);
}
