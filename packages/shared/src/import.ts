import { questionSchema, type QuestionInput } from './schemas';

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

/** RFC4180-ish CSV parser: quoted fields, escaped quotes, CRLF/LF. */
export function parseCsv(text: string): CsvTable {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  const headers = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  return { headers, rows };
}

export interface QuestionImportRow {
  rowNumber: number;
  subject: 'english' | 'math';
  topic: string;
  subtopic?: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  kind: 'mcq' | 'numeric';
  prompt: string;
  stimulus?: string | null;
  directions?: string | null;
  points: number;
  sourceNote?: string | null;
  options: { label: string; text: string }[];
  correctOptionLabel?: string | null;
  numericAnswer?: string | number | null;
  numericTolerance: number;
  explanation: string;
}

export interface ImportError {
  rowNumber: number;
  field?: string;
  message: string;
}

export interface ImportResult {
  rows: QuestionImportRow[];
  errors: ImportError[];
  duplicates: { rowNumber: number; key: string }[];
}

/** Stable identity used to skip rows that are already in the question bank. */
export function importRowKey(row: { subject: string; topic: string; prompt: string }): string {
  return `${row.subject}|${row.topic.trim().toLowerCase()}|${row.prompt.trim().toLowerCase()}`;
}

function toNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Validates a CSV or JSON payload of questions.
 * Row level errors are reported with their original row number so the admin
 * can fix exactly the offending entries; valid rows are still returned.
 */
export function parseQuestionImport(text: string, format: 'csv' | 'json' = 'csv'): ImportResult {
  const rows: QuestionImportRow[] = [];
  const errors: ImportError[] = [];
  const seen = new Map<string, number>();

  let candidates: { rowNumber: number; raw: Record<string, unknown> }[] = [];

  if (format === 'json') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      return {
        rows: [],
        errors: [{ rowNumber: 0, message: `Invalid JSON: ${(error as Error).message}` }],
        duplicates: [],
      };
    }
    if (!Array.isArray(parsed)) {
      return {
        rows: [],
        errors: [{ rowNumber: 0, message: 'JSON payload must be an array of question objects' }],
        duplicates: [],
      };
    }
    candidates = parsed.map((raw, index) => ({
      rowNumber: index + 1,
      raw: (raw ?? {}) as Record<string, unknown>,
    }));
  } else {
    const table = parseCsv(text);
    const required = ['subject', 'topic', 'kind', 'prompt'];
    const missing = required.filter((header) => !table.headers.includes(header));
    if (missing.length > 0) {
      return {
        rows: [],
        errors: [
          {
            rowNumber: 0,
            message: `Missing required CSV columns: ${missing.join(', ')}`,
          },
        ],
        duplicates: [],
      };
    }
    candidates = table.rows.map((values, index) => {
      const raw: Record<string, unknown> = {};
      table.headers.forEach((header, column) => {
        raw[header] = values[column] ?? '';
      });
      return { rowNumber: index + 2, raw };
    });
  }

  const duplicates: { rowNumber: number; key: string }[] = [];

  for (const candidate of candidates) {
    const raw = candidate.raw;
    const subject = String(raw.subject ?? '').trim().toLowerCase();
    const kind = String(raw.kind ?? '').trim().toLowerCase();
    const difficulty = String(raw.difficulty ?? 'medium').trim().toLowerCase() || 'medium';
    const prompt = String(raw.prompt ?? '').trim();
    const topic = String(raw.topic ?? '').trim();

    const optionText = String(raw.options ?? '').trim();
    const options = optionText
      ? optionText
          .split('|')
          .map((text) => text.trim())
          .filter((text) => text.length > 0)
          .map((text, index) => ({
            label: String.fromCharCode(65 + index),
            text,
          }))
      : [];

    const candidateRow = {
      rowNumber: candidate.rowNumber,
      subject,
      topic,
      subtopic: String(raw.subtopic ?? '').trim() || null,
      difficulty,
      kind,
      prompt,
      stimulus: String(raw.stimulus ?? '').trim() || null,
      directions: String(raw.directions ?? '').trim() || null,
      points: toNumber(raw.points === undefined ? undefined : String(raw.points), 1),
      sourceNote: String(raw.source_note ?? raw.sourceNote ?? '').trim() || null,
      options,
      correctOptionLabel: String(raw.correct ?? raw.correct_option_label ?? '').trim().toUpperCase() || null,
      numericAnswer: String(raw.numeric_answer ?? raw.numericAnswer ?? '').trim() || null,
      numericTolerance: toNumber(
        raw.numeric_tolerance === undefined ? undefined : String(raw.numeric_tolerance),
        0,
      ),
      explanation: String(raw.explanation ?? '').trim(),
    };

    const validation = questionSchema.safeParse({
      courseId: '00000000-0000-0000-0000-000000000000',
      lessonId: null,
      subject: candidateRow.subject,
      topic: candidateRow.topic,
      subtopic: candidateRow.subtopic,
      difficulty: candidateRow.difficulty,
      kind: candidateRow.kind,
      prompt: candidateRow.prompt,
      stimulus: candidateRow.stimulus,
      directions: candidateRow.directions,
      points: candidateRow.points,
      sourceNote: candidateRow.sourceNote,
      status: 'draft',
      options: candidateRow.options,
      correctOptionLabel: candidateRow.correctOptionLabel,
      numericAnswer: candidateRow.numericAnswer,
      numericTolerance: candidateRow.numericTolerance,
      explanation: candidateRow.explanation,
    });

    if (!validation.success) {
      for (const issue of validation.error.issues) {
        errors.push({
          rowNumber: candidate.rowNumber,
          field: issue.path.join('.'),
          message: issue.message,
        });
      }
      continue;
    }

    const key = importRowKey(candidateRow);
    const firstSeen = seen.get(key);
    if (firstSeen !== undefined) {
      duplicates.push({ rowNumber: candidate.rowNumber, key });
      errors.push({
        rowNumber: candidate.rowNumber,
        message: `Duplicate of row ${firstSeen} (same subject, topic and prompt)`,
      });
      continue;
    }
    seen.set(key, candidate.rowNumber);

    rows.push({
      rowNumber: candidate.rowNumber,
      subject: validation.data.subject,
      topic: validation.data.topic,
      subtopic: validation.data.subtopic ?? null,
      difficulty: validation.data.difficulty,
      kind: validation.data.kind,
      prompt: validation.data.prompt,
      stimulus: validation.data.stimulus ?? null,
      directions: validation.data.directions ?? null,
      points: validation.data.points,
      sourceNote: validation.data.sourceNote ?? null,
      options: validation.data.options,
      correctOptionLabel: validation.data.correctOptionLabel ?? null,
      numericAnswer: validation.data.numericAnswer ?? null,
      numericTolerance: validation.data.numericTolerance,
      explanation: validation.data.explanation ?? '',
    });
  }

  return { rows, errors, duplicates };
}

export type ImportedQuestion = QuestionInput;
