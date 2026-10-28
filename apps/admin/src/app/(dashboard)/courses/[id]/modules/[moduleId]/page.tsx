import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

const statusStyles: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-zinc-100 text-zinc-500",
};

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  await requireAdmin();
  const { id, moduleId } = await params;
  const supabase = await createClient();

  const { data: module } = await supabase
    .from("course_modules")
    .select("*")
    .eq("id", moduleId)
    .maybeSingle();

  if (!module) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, summary, status, estimated_minutes, sort_order")
    .eq("module_id", moduleId)
    .order("sort_order");

  return (
    <div className="p-8">
      <Link
        href={`/courses/${id}`}
        className="text-sm text-zinc-500 hover:text-zinc-900"
      >
        ← Back to course
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{module.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {module.description || "No description"}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[module.status]}`}
        >
          {module.status}
        </span>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Lessons</h2>
        <Link
          href={`/courses/${id}/modules/${moduleId}/lessons/new`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New lesson
        </Link>
      </div>

      {lessons && lessons.length > 0 ? (
        <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/courses/${id}/modules/${moduleId}/lessons/${lesson.id}`}
                className="flex items-center justify-between px-5 py-4 text-sm hover:bg-zinc-50"
              >
                <div>
                  <p className="font-medium text-zinc-900">{lesson.title}</p>
                  <p className="text-xs text-zinc-500">
                    ~{lesson.estimated_minutes}m{lesson.summary ? ` · ${lesson.summary}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[lesson.status]}`}
                >
                  {lesson.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No lessons yet.</p>
      )}
    </div>
  );
}
