import Link from "next/link";
import NewLessonForm from "./lesson-form";

export default function NewLessonPage() {
  return (
    <div className="p-8">
      <Link
        href="/courses"
        className="text-sm text-zinc-500 hover:text-zinc-900"
      >
        ← Back to courses
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">New lesson</h1>
      <NewLessonForm />
    </div>
  );
}
