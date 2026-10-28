import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

async function count(supabase: Awaited<ReturnType<typeof createClient>>, table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) return null;
  return count;
}

export default async function OverviewPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [courses, lessons, questions, users, sessions, audit] = await Promise.all([
    count(supabase, "courses"),
    count(supabase, "lessons"),
    count(supabase, "questions"),
    count(supabase, "profiles"),
    count(supabase, "test_sessions"),
    count(supabase, "audit_logs"),
  ]);

  const { data: recentAudit } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const cards = [
    { label: "Courses", value: courses, href: "/courses" },
    { label: "Lessons", value: lessons, href: "/courses" },
    { label: "Questions", value: questions, href: "/questions" },
    { label: "Users", value: users, href: null },
    { label: "Sessions", value: sessions, href: null },
    { label: "Audit entries", value: audit, href: "/audit" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Overview</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Live counts across the ZK catalogue and user base.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const inner = (
            <>
              <p className="text-3xl font-semibold text-zinc-900">
                {card.value === null ? "—" : card.value}
              </p>
              <p className="text-sm text-zinc-500">{card.label}</p>
            </>
          );
          return card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-xl border border-zinc-200 p-5 transition-colors hover:border-zinc-400"
            >
              {inner}
            </Link>
          ) : (
            <div key={card.label} className="rounded-xl border border-zinc-200 p-5">
              {inner}
            </div>
          );
        })}
      </div>

      <h2 className="mt-12 text-lg font-semibold text-zinc-900">Recent activity</h2>
      {recentAudit && recentAudit.length > 0 ? (
        <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
          {recentAudit.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-zinc-800">{entry.action}</span>
              <span className="text-xs text-zinc-500">
                {entry.entity_type} · {new Date(entry.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No audit entries yet.</p>
      )}
    </div>
  );
}
