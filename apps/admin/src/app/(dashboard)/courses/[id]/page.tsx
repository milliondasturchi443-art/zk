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

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!course) notFound();

  const { data: modules } = await supabase
    .from("course_modules")
    .select("*")
    .eq("course_id", id)
    .order("sort_order");

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, module_id, title, status, estimated_minutes")
    .order("sort_order");

  return (
    <div className="p-8">
      <Link href="/courses" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← Back to courses
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{course.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            /{course.slug} · {course.subject} · {course.description || "No description"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[course.status]}`}
          >
            {course.status}
          </span>
          <Link
            href={`/courses/${course.id}/edit`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Modules</h2>
        <Link
          href={`/courses/${course.id}/modules/new`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New module
        </Link>
      </div>

      {modules && modules.length > 0 ? (
        <ul className="mt-4 space-y-6">
          {modules.map((module) => (
            <li key={module.id} className="rounded-xl border border-zinc-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900">{module.title}</p>
                  <p className="text-xs text-zinc-500">{module.description || "No description"}</p>
                </div>
                <Link
                  href={`/courses/${course.id}/modules/${module.id}`}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Manage
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {(lessons ?? [])
                  .filter((l) => l.module_id === module.id)
                  .map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <span className="text-zinc-800">{lesson.title}</span>
                      <span className="text-xs text-zinc-500">
                        ~{lesson.estimated_minutes}m · {lesson.status}
                      </span>
                    </li>
                  ))}
                {lessons?.filter((l) => l.module_id === module.id).length === 0 ? (
                  <li className="px-3 py-2 text-sm text-zinc-500">No lessons yet.</li>
                ) : null}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No modules yet.</p>
      )}
    </div>
  );
}
