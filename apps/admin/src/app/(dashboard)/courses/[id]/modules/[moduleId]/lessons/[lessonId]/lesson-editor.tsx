"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; text: string }
  | { type: "quote"; text: string };

type LessonRow = {
  id: string;
  title: string;
  summary: string;
  content: Block[];
  estimated_minutes: number;
  status: string;
};

const BLOCK_TYPES: Block["type"][] = ["heading", "paragraph", "list", "code", "quote"];

export default function LessonEditor() {
  const router = useRouter();
  const params = useParams<{ id: string; moduleId: string; lessonId: string }>();

  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(10);
  const [status, setStatus] = useState("draft");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    createClient()
      .from("lessons")
      .select("*")
      .eq("id", params.lessonId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setError(error?.message ?? "Lesson not found.");
          return;
        }
        const row = data as LessonRow;
        setTitle(row.title);
        setSummary(row.summary);
        setEstimatedMinutes(row.estimated_minutes);
        setStatus(row.status);
        setBlocks(Array.isArray(row.content) ? (row.content as Block[]) : []);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [params.lessonId]);

  function updateBlock(index: number, patch: Partial<Block>) {
    setBlocks((prev) =>
      prev.map((block, i) => (i === index ? ({ ...block, ...patch } as Block) : block)),
    );
  }

  function addBlock(type: Block["type"]) {
    const base: Block =
      type === "list"
        ? { type, items: [""] }
        : { type, text: "" };
    setBlocks((prev) => [...prev, base]);
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("lessons")
        .update({ title, summary, content: blocks, estimated_minutes: estimatedMinutes, status })
        .eq("id", params.lessonId);
      if (updateError) throw updateError;
      router.push(`/courses/${params.id}/modules/${params.moduleId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save lesson.");
    } finally {
      setLoading(false);
    }
  }

  if (!loaded && !error) {
    return <p className="mt-8 text-sm text-zinc-500">Loading lesson…</p>;
  }

  const inputCls =
    "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500";

  return (
    <form onSubmit={onSubmit} className="mt-8 flex max-w-2xl flex-col gap-4">
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
            <option value="archived">archived</option>
          </select>
        </label>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">Content blocks</p>
          <select
            defaultValue=""
            onChange={(e) => {
              const type = e.target.value as Block["type"];
              if (type) addBlock(type);
              e.target.value = "";
            }}
            className={`${inputCls} py-1`}
          >
            <option value="" disabled>
              Add block…
            </option>
            {BLOCK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {blocks.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No content blocks yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {blocks.map((block, i) => (
              <li
                key={i}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {block.type}
                  </span>
                  <div className="flex gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => moveBlock(i, -1)}
                      className="text-zinc-500 hover:text-zinc-900"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(i, 1)}
                      className="text-zinc-500 hover:text-zinc-900"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {block.type === "list" ? (
                  <div className="mt-2 flex flex-col gap-2">
                    {block.items.map((item, itemIndex) => (
                      <input
                        key={itemIndex}
                        value={item}
                        onChange={(e) => {
                          const items = [...block.items];
                          items[itemIndex] = e.target.value;
                          updateBlock(i, { items });
                        }}
                        className={inputCls}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateBlock(i, { items: [...block.items, ""] })
                      }
                      className="self-start text-xs text-zinc-500 hover:text-zinc-900"
                    >
                      + Add item
                    </button>
                  </div>
                ) : (
                  <textarea
                    value={block.text ?? ""}
                    onChange={(e) => updateBlock(i, { text: e.target.value })}
                    rows={block.type === "code" ? 6 : 3}
                    className={`${inputCls} mt-2 w-full`}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
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
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save lesson"}
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
