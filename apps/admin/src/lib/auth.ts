import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = {
  user: NonNullable<Awaited<ReturnType<typeof getAdminUser>>>;
};

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") return null;
  return profile;
}

/** Throws a redirect to /login unless the current user is an admin. */
export async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login");
  return admin;
}
