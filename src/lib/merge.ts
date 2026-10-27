// Merge-field engine: {{var}} with {{var | fallback}} support, HTML-escaping of
// cell values, and template-variable validation against the mapped columns.

import type { ColumnMapping } from "./types";

// Matches {{ name }} and {{ name | fallback text }}
const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|\s*([^}]*?))?\s*\}\}/g;

export interface TokenRef {
  key: string;
  fallback: string | null;
  raw: string;
}

/** Every {{token}} referenced anywhere in a string. */
export function extractTokens(text: string): TokenRef[] {
  const out: TokenRef[] = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    out.push({
      key: m[1],
      fallback: m[2] !== undefined ? m[2].trim() : null,
      raw: m[0],
    });
  }
  return out;
}

/** Escape a CSV cell so odd characters cannot break the email's HTML layout. */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resolve a value for a token from a recipient row, honoring the mapping and
 * falling back to {{var | fallback}} when the cell is blank or unmapped.
 */
function resolveValue(
  ref: TokenRef,
  row: Record<string, string>,
  mapping: ColumnMapping
): string | null {
  const column = mapping[ref.key];
  let cell = "";
  if (column && Object.prototype.hasOwnProperty.call(row, column)) {
    cell = (row[column] ?? "").trim();
  }
  if (cell) return cell;
  if (ref.fallback !== null) return ref.fallback;
  return null; // unresolved and no fallback
}

export interface MergeResult {
  text: string;        // merged + escaped (safe for HTML body)
  plain: string;       // merged, unescaped (safe for subject / plain contexts)
  unknownVars: string[]; // tokens with no mapped column AND no fallback -> blocks send
  usedFallback: string[];
}

/**
 * Merge a template string for one recipient row.
 * @param forHtml when true, resolved cell values are HTML-escaped.
 */
export function mergeText(
  template: string,
  row: Record<string, string>,
  mapping: ColumnMapping,
  forHtml: boolean
): MergeResult {
  const unknownVars: string[] = [];
  const usedFallback: string[] = [];

  // A token is "unknown" when it is not a mapped column. If it has a fallback,
  // it still renders (the fallback), but a *typo with no column and no fallback*
  // is a hard block.
  const mappedKeys = new Set(Object.keys(mapping).filter((k) => mapping[k]));

  const replacer = (raw: string): string => {
    const [ref] = extractTokens(raw);
    if (!ref) return raw;
    const val = resolveValue(ref, row, mapping);
    const mapped = mappedKeys.has(ref.key);
    if (!mapped && ref.fallback === null) {
      if (!unknownVars.includes(ref.key)) unknownVars.push(ref.key);
      return raw; // leave the token visible so the preview shows the problem
    }
    if (val === null) {
      if (!unknownVars.includes(ref.key)) unknownVars.push(ref.key);
      return raw;
    }
    if (!mapped || !(row[mapping[ref.key] as string] || "").trim()) {
      if (!usedFallback.includes(ref.key)) usedFallback.push(ref.key);
    }
    return forHtml ? escapeHtml(val) : val;
  };

  const text = template.replace(TOKEN_RE, (m) => replacer(m));
  const plain = forHtml
    ? mergeText(template, row, mapping, false).text
    : text;

  return { text, plain: forHtml ? plain : text, unknownVars, usedFallback };
}

/**
 * Validate a whole template (subject + body) against the mapping. Returns the
 * set of variable keys that are referenced but have no mapped column and no
 * fallback — these block the send (FR#5 "typo caught before send").
 */
export function validateTemplateVars(
  subject: string,
  bodyHtml: string,
  mapping: ColumnMapping
): { unknown: string[]; referenced: string[] } {
  const mappedKeys = new Set(Object.keys(mapping).filter((k) => mapping[k]));
  const refs = [...extractTokens(subject), ...extractTokens(bodyHtml)];
  const referenced = Array.from(new Set(refs.map((r) => r.key)));
  const unknown = Array.from(
    new Set(
      refs
        .filter((r) => !mappedKeys.has(r.key) && r.fallback === null)
        .map((r) => r.key)
    )
  );
  return { unknown, referenced };
}
