import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AuditPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="p-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Audit log</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Every admin action that mutates content, recorded automatically.
        </p>
      </div>

      {logs && logs.length > 0 ? (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
          {logs.map((log) => (
            <li key={log.id} className="px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-zinc-900">{log.action}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                {log.entity_type}
                {log.entity_id ? ` · ${log.entity_id}` : ""}
              </p>
              {Object.keys(log.details ?? {}).length > 0 ? (
                <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-700">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">No audit entries yet.</p>
      )}
    </div>
  );
}
