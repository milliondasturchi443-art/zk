import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

const statusStyles: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-zinc-100 text-zinc-500",
};

export default async function CoursesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, subject, status")
    .order("subject")
    .order("sort_order");

  const { data: moduleRows } = await supabase
    .from("course_modules")
    .select("id, course_id");

  const { data: lessonRows } = await supabase
    .from("lessons")
    .select("id, module_id");

  const lessonCounts = new Map<string, number>();
  for (const lesson of lessonRows ?? []) {
    const mod = (moduleRows ?? []).find((m) => m.id === lesson.module_id);
    if (!mod) continue;
    lessonCounts.set(mod.course_id, (lessonCounts.get(mod.course_id) ?? 0) + 1);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Courses</h1>
          <p className="mt-1 text-sm text-zinc-500">
            The course catalogue — modules and lessons live inside a course.
          </p>
        </div>
        <Link
          href="/courses/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New course
        </Link>
      </div>

      {courses && courses.length > 0 ? (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/courses/${course.id}`}
                className="flex items-center justify-between px-5 py-4 text-sm hover:bg-zinc-50"
              >
                <div>
                  <p className="font-medium text-zinc-900">{course.title}</p>
                  <p className="text-xs text-zinc-500">
                    /{course.slug} · {course.subject} · {lessonCounts.get(course.id) ?? 0} lessons
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[course.status] ?? statusStyles.draft}`}
                >
                  {course.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">No courses yet.</p>
      )}
    </div>
  );
}
