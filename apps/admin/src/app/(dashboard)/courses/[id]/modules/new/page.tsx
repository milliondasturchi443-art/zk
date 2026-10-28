import Link from "next/link";
import NewModuleForm from "./module-form";

export default function NewModulePage() {
  return (
    <div className="p-8">
      <Link href="/courses" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← Back to courses
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">New module</h1>
      <NewModuleForm />
    </div>
  );
}
