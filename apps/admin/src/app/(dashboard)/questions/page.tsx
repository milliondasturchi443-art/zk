import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

const statusStyles: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-zinc-100 text-zinc-500",
};

const difficultyStyles: Record<string, string> = {
  easy: "text-emerald-700",
  medium: "text-amber-700",
  hard: "text-red-700",
};

export default async function QuestionsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: questions } = await supabase
    .from("questions")
    .select("id, subject, topic, subtopic, difficulty, kind, prompt, status, course_id")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Question bank</h1>
          <p className="mt-1 text-sm text-zinc-500">
            MCQs and numeric questions used in practice sessions.
          </p>
        </div>
        <Link
          href="/questions/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New question
        </Link>
      </div>

      {questions && questions.length > 0 ? (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
          {questions.map((question) => (
            <li key={question.id}>
              <Link
                href={`/questions/${question.id}`}
                className="block px-5 py-4 text-sm hover:bg-zinc-50"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">
                      {question.prompt}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {question.subject} · {question.topic}
                      {question.subtopic ? ` / ${question.subtopic}` : ""}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3 text-xs">
                    <span className={difficultyStyles[question.difficulty]}>
                      {question.difficulty}
                    </span>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-600">
                      {question.kind}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 font-medium ${statusStyles[question.status]}`}
                    >
                      {question.status}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">No questions yet.</p>
      )}
    </div>
  );
}
