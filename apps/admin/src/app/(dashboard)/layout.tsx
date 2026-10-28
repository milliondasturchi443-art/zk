import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { requireAdmin } from "@/lib/auth";

export const instant = false;

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/courses", label: "Courses" },
  { href: "/questions", label: "Questions" },
  { href: "/audit", label: "Audit log" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The dashboard subtree reads authed per-request data (Supabase token expiry
  // internals call Date.now()). Stop prerendering here so the whole dashboard
  // is generated at request time instead of shipping a static shell that trips
  // the `blocking-prerender-current-time` validation.
  await connection();

  const admin = await requireAdmin();

  async function signOut() {
    "use server";
    const supabase = await (await import("@/lib/supabase/server")).createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 flex-col border-r border-zinc-200 bg-zinc-50">
        <div className="px-5 py-4">
          <p className="text-lg font-semibold text-zinc-900">ZK Admin</p>
          <p className="text-xs text-zinc-500">Content console</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-200/70"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-200 px-5 py-4">
          <p className="truncate text-sm font-medium text-zinc-800">{admin.full_name}</p>
          <p className="truncate text-xs text-zinc-500">{admin.email}</p>
          <form action={signOut} className="mt-3">
            <button
              type="submit"
              className="text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-white">{children}</main>
    </div>
  );
}
