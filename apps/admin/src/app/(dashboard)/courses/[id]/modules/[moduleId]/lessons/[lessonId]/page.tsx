import Link from "next/link";
import LessonEditor from "./lesson-editor";

export default function EditLessonPage() {
  return (
    <div className="p-8">
      <Link
        href="/courses"
        className="text-sm text-zinc-500 hover:text-zinc-900"
      >
        ← Back to courses
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Edit lesson</h1>
      <LessonEditor />
    </div>
  );
}
