import Link from "next/link";
import QuestionForm from "../question-form";

export default function EditQuestionPage() {
  return (
    <div className="p-8">
      <Link href="/questions" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← Back to questions
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Edit question</h1>
      <QuestionForm />
    </div>
  );
}
