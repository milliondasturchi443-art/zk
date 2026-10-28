"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const SUBJECTS = ["english", "math"] as const;

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  subject: string;
  description: string;
  status: string;
};

export default function EditCourseForm() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>("english");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    createClient()
      .from("courses")
      .select("*")
      .eq("id", params.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setError(error?.message ?? "Course not found.");
          return;
        }
        const row = data as CourseRow;
        setTitle(row.title);
        setSlug(row.slug);
        setSubject(row.subject as (typeof SUBJECTS)[number]);
        setDescription(row.description);
        setStatus(row.status);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("courses")
        .update({ title, slug, subject, description, status })
        .eq("id", params.id);
      if (updateError) throw updateError;
      router.push(`/courses/${params.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save course.");
    } finally {
      setLoading(false);
    }
  }

  if (!loaded && !error) {
    return <p className="mt-8 text-sm text-zinc-500">Loading course…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Slug
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          required
          pattern="[a-z0-9][a-z0-9-]{1,60}"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Subject
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value as (typeof SUBJECTS)[number])}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        >
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
      </label>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save changes"}
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
