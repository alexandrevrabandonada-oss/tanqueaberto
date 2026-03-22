import { redirect } from "next/navigation";
import type { Route } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminUser {
  email: string;
}

const ADMIN_LOGIN_ROUTE = "/admin/login" as Route;

async function lookupAdminUser(email: string) {
  const supabase = await createSupabaseServerClient();
  const normalizedEmail = email.trim().toLowerCase();

  return supabase.from("admin_users").select("email").eq("email", normalizedEmail).maybeSingle();
}

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user?.email) {
    return null;
  }

  const { data, error } = await lookupAdminUser(userResult.user.email);

  if (error) {
    throw new Error(`Failed to verify admin access: ${error.message}`);
  }

  if (!data?.email) {
    return null;
  }

  return { email: data.email };
}

export async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user?.email) {
    redirect(ADMIN_LOGIN_ROUTE);
  }

  const { data, error } = await lookupAdminUser(userResult.user.email);

  if (error) {
    throw new Error(`Failed to verify admin access: ${error.message}`);
  }

  if (!data?.email) {
    await supabase.auth.signOut();
    redirect(ADMIN_LOGIN_ROUTE);
  }

  return { email: data.email } satisfies AdminUser;
}
