import { redirect } from "next/navigation";
import type { Route } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email: string;
}

const ADMIN_LOGIN_ROUTE = "/admin/login" as Route;

async function lookupAdminUser(email: string) {
  const supabase = await createSupabaseServerClient();
  const normalizedEmail = email.trim().toLowerCase();

  return supabase.from("admin_users").select("user_id,email").eq("email", normalizedEmail).maybeSingle();
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

  return { id: data.user_id, email: data.email };
}

export async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user?.email || !userResult.user.id) {
    redirect(ADMIN_LOGIN_ROUTE);
  }

  const { data, error } = await lookupAdminUser(userResult.user.email);

  if (error) {
    throw new Error(`Failed to verify admin access: ${error.message}`);
  }

  if (!data?.email || !data?.user_id) {
    await supabase.auth.signOut();
    redirect(ADMIN_LOGIN_ROUTE);
  }

  return { id: data.user_id, email: data.email } satisfies AdminUser;
}
