import Link from "next/link";
import NewCourseForm from "./course-form";

export default function NewCoursePage() {
  return (
    <div className="p-8">
      <Link href="/courses" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← Back to courses
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">New course</h1>
      <NewCourseForm />
    </div>
  );
}
