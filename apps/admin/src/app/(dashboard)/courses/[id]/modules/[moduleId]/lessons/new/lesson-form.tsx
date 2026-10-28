"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function NewLessonForm() {
  const router = useRouter();
  const params = useParams<{ id: string; moduleId: string }>();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(10);
  const [status, setStatus] = useState("draft");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("lessons")
        .insert({
          module_id: params.moduleId,
          title,
          summary,
          estimated_minutes: estimatedMinutes,
          status,
          content: [],
          sort_order: 0,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      router.push(
        `/courses/${params.id}/modules/${params.moduleId}/lessons/${data.id}`,
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create lesson.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500";

  return (
    <form onSubmit={onSubmit} className="mt-8 flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Summary
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          className={inputCls}
        />
      </label>
      <div className="flex gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Estimated minutes
          <input
            type="number"
            min={1}
            max={600}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputCls}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create lesson"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
