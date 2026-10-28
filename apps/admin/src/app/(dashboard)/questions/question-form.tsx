"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const SUBJECTS = ["english", "math"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const KINDS = ["mcq", "numeric"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

type Option = { label: string; text: string };

type QuestionRow = {
  id: string;
  course_id: string;
  subject: string;
  topic: string;
  subtopic: string | null;
  difficulty: string;
  kind: string;
  prompt: string;
  stimulus: string | null;
  directions: string | null;
  points: number;
  source_note: string | null;
  status: string;
};

type OptionRow = { id: string; label: string; text: string };

type KeyRow = {
  correct_option_id: string | null;
  numeric_answer: string | number | null;
  numeric_tolerance: number;
  explanation: string | null;
};

export default function QuestionForm({ questionId }: { questionId?: string }) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const editing = Boolean(questionId);
  const targetId = questionId ?? params.id;

  const [loaded, setLoaded] = useState(!editing);
  const [courseId, setCourseId] = useState("");
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>("english");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("medium");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("mcq");
  const [prompt, setPrompt] = useState("");
  const [stimulus, setStimulus] = useState("");
  const [directions, setDirections] = useState("");
  const [points, setPoints] = useState(1);
  const [sourceNote, setSourceNote] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("draft");
  const [options, setOptions] = useState<Option[]>([{ label: "A", text: "" }]);
  const [correctOptionLabel, setCorrectOptionLabel] = useState("A");
  const [numericAnswer, setNumericAnswer] = useState("");
  const [numericTolerance, setNumericTolerance] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!editing) return;
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data: question, error: questionError } = await supabase
        .from("questions")
        .select("*")
        .eq("id", targetId)
        .maybeSingle();
      if (!active) return;
      if (questionError || !question) {
        setError(questionError?.message ?? "Question not found.");
        return;
      }
      const row = question as QuestionRow;
      setCourseId(row.course_id);
      setSubject(row.subject as (typeof SUBJECTS)[number]);
      setTopic(row.topic);
      setSubtopic(row.subtopic ?? "");
      setDifficulty(row.difficulty as (typeof DIFFICULTIES)[number]);
      setKind(row.kind as (typeof KINDS)[number]);
      setPrompt(row.prompt);
      setStimulus(row.stimulus ?? "");
      setDirections(row.directions ?? "");
      setPoints(row.points);
      setSourceNote(row.source_note ?? "");
      setStatus(row.status as (typeof STATUSES)[number]);

      const { data: optionRows } = await supabase
        .from("question_options")
        .select("id, label, text")
        .eq("question_id", targetId)
        .order("position");
      const opts = (optionRows ?? []).map((o: OptionRow) => ({
        label: o.label,
        text: o.text,
      }));
      setOptions(opts.length ? opts : [{ label: "A", text: "" }]);

      const { data: keyRow } = await supabase
        .from("question_keys")
        .select("*")
        .eq("question_id", targetId)
        .maybeSingle();
      if (keyRow) {
        const key = keyRow as KeyRow;
        const correctOption = (optionRows ?? []).find(
          (o) => o.id === key.correct_option_id,
        );
        setCorrectOptionLabel(correctOption?.label ?? "A");
        setNumericAnswer(key.numeric_answer == null ? "" : String(key.numeric_answer));
        setNumericTolerance(key.numeric_tolerance);
        setExplanation(key.explanation ?? "");
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [editing, targetId]);

  function updateOption(index: number, patch: Partial<Option>) {
    setOptions((prev) =>
      prev.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    );
  }

  function addOption() {
    if (options.length >= 8) return;
    const nextLabel = String.fromCharCode(65 + options.length);
    setOptions((prev) => [...prev, { label: nextLabel, text: "" }]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): string | null {
    if (!topic.trim()) return "Topic is required.";
    if (!prompt.trim()) return "Question text is required.";
    if (kind === "mcq") {
      if (options.length < 2) return "Multiple choice questions need at least two options.";
      const labels = new Set(options.map((o) => o.label));
      if (labels.size !== options.length) return "Option labels must be unique.";
      if (options.some((o) => !o.text.trim())) return "Every option needs text.";
      if (!options.some((o) => o.label === correctOptionLabel)) {
        return "The correct answer must match one of the options.";
      }
    }
    if (kind === "numeric") {
      if (!numericAnswer.trim()) return "Numeric questions need a correct answer.";
      const parsed = Number(numericAnswer.trim());
      if (!Number.isFinite(parsed)) return "Enter a valid number.";
    }
    if (status === "published" && !explanation.trim()) {
      return "Published questions must include an explanation.";
    }
    return null;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const base = {
        course_id: courseId || null,
        subject,
        topic,
        subtopic: subtopic || null,
        difficulty,
        kind,
        prompt,
        stimulus: stimulus || null,
        directions: directions || null,
        points,
        source_note: sourceNote || null,
        status,
      };

      let questionId = targetId;
      if (editing) {
        const { error: updateError } = await supabase
          .from("questions")
          .update(base)
          .eq("id", targetId);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("questions")
          .insert(base)
          .select("id")
          .single();
        if (insertError) throw insertError;
        questionId = data.id;
      }

      if (kind === "mcq") {
        const { error: deleteOptionsError } = await supabase
          .from("question_options")
          .delete()
          .eq("question_id", questionId);
        if (deleteOptionsError) throw deleteOptionsError;

        const rows = options.map((option, position) => ({
          question_id: questionId,
          label: option.label,
          text: option.text,
          position,
        }));
        const { data: inserted, error: optionsError } = await supabase
          .from("question_options")
          .insert(rows)
          .select("id, label");
        if (optionsError) throw optionsError;

        const correct = (inserted ?? []).find((o) => o.label === correctOptionLabel);
        const { error: keysError } = await supabase.from("question_keys").upsert(
          {
            question_id: questionId,
            correct_option_id: correct?.id ?? null,
            numeric_answer: null,
            numeric_tolerance: 0,
            explanation: explanation.trim() ? explanation : null,
          },
          { onConflict: "question_id" },
        );
        if (keysError) throw keysError;
      } else {
        const { error: keysError } = await supabase.from("question_keys").upsert(
          {
            question_id: questionId,
            correct_option_id: null,
            numeric_answer: numericAnswer.trim() ? numericAnswer.trim() : null,
            numeric_tolerance: numericTolerance,
            explanation: explanation.trim() ? explanation : null,
          },
          { onConflict: "question_id" },
        );
        if (keysError) throw keysError;
      }

      router.push("/questions");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save question.");
    } finally {
      setLoading(false);
    }
  }

  if (!loaded && !error) {
    return <p className="mt-8 text-sm text-zinc-500">Loading question…</p>;
  }

  const inputCls =
    "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500";

  return (
    <form onSubmit={onSubmit} className="mt-8 flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Subject
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as (typeof SUBJECTS)[number])}
            className={inputCls}
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}
            className={inputCls}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as (typeof DIFFICULTIES)[number])}
            className={inputCls}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
            className={inputCls}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Topic
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Subtopic (optional)
        <input
          value={subtopic}
          onChange={(e) => setSubtopic(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Question text
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          rows={3}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Stimulus / passage (optional)
        <textarea
          value={stimulus}
          onChange={(e) => setStimulus(e.target.value)}
          rows={4}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Directions (optional)
        <input
          value={directions}
          onChange={(e) => setDirections(e.target.value)}
          className={inputCls}
        />
      </label>

      {kind === "mcq" ? (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700">Options</p>
            <button
              type="button"
              onClick={addOption}
              disabled={options.length >= 8}
              className="text-sm text-zinc-500 hover:text-zinc-900 disabled:opacity-40"
            >
              + Add option
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {options.map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={option.label}
                  onChange={(e) => updateOption(i, { label: e.target.value.toUpperCase() })}
                  maxLength={1}
                  className={`${inputCls} w-14 text-center`}
                />
                <input
                  value={option.text}
                  onChange={(e) => updateOption(i, { text: e.target.value })}
                  placeholder="Option text"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => setCorrectOptionLabel(option.label)}
                  title="Mark as correct"
                  className={`h-9 w-9 rounded-md border text-sm ${
                    correctOptionLabel === option.label
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-zinc-300 text-zinc-400 hover:bg-zinc-50"
                  }`}
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={options.length <= 2}
                  className="text-sm text-red-500 hover:text-red-700 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Use the checkmark to mark the correct option.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Correct answer
            <input
              value={numericAnswer}
              onChange={(e) => setNumericAnswer(e.target.value)}
              placeholder="e.g. 12 or 3/4"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tolerance
            <input
              type="number"
              min={0}
              value={numericTolerance}
              onChange={(e) => setNumericTolerance(Number(e.target.value))}
              className={inputCls}
            />
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Explanation
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          className={inputCls}
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Points
          <input
            type="number"
            min={1}
            max={100}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Source note (optional)
          <input
            value={sourceNote}
            onChange={(e) => setSourceNote(e.target.value)}
            className={inputCls}
          />
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
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Saving…" : editing ? "Save changes" : "Create question"}
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
