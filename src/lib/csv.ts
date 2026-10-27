// In-memory CSV parsing & validation (FR#3). The file is read with FileReader
// and parsed with PapaParse; its contents are NEVER written to disk.

import Papa from "papaparse";
import type { CsvWarning, ParsedCsv, VariableKey } from "./types";
import { isValidEmail, normalizeEmail } from "./email";

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const EMAIL_HEADER_HINTS = ["email", "e-mail", "email address", "mail", "emailaddress"];

function guessEmailColumn(headers: string[], rows: Record<string, string>[]): string | null {
  // 1) header name hint
  for (const h of headers) {
    if (EMAIL_HEADER_HINTS.includes(h.trim().toLowerCase())) return h;
  }
  // 2) by content — a column where most cells look like emails
  for (const h of headers) {
    const sample = rows.slice(0, 20).map((r) => r[h] || "");
    const hits = sample.filter((v) => isValidEmail(v)).length;
    if (sample.length && hits / sample.length > 0.6) return h;
  }
  return null;
}

/** Parse a File into an in-memory ParsedCsv with validation warnings. */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      let text = String(reader.result ?? "");
      // Strip UTF-8 BOM (Excel) so the first header isn't "﻿email".
      const hadBom = text.charCodeAt(0) === 0xfeff;
      if (hadBom) text = text.slice(1);

      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (h) => h.replace(/﻿/g, "").trim(), // normalize trailing/leading space + BOM
      });

      const warnings: CsvWarning[] = [];
      const rawHeaders = (result.meta.fields ?? []).filter(Boolean);
      // Detect headers that had a trailing space before normalization.
      const original = text.split(/\r?\n/)[0] ?? "";
      if (/,\s|\s,|\s$/.test(original.replace(/"[^"]*"/g, ""))) {
        const spaced = original
          .split(",")
          .filter((h) => h !== h.trim())
          .map((h) => `"${h}"`);
        if (spaced.length) {
          warnings.push({
            kind: "trailing-space-header",
            message: "Trailing space on a header was normalized automatically.",
            detail: spaced.join(", "),
          });
        }
      }

      let rows = (result.data || []).filter(
        (r) => r && Object.values(r).some((v) => (v ?? "").toString().trim() !== "")
      );
      const totalRowsInFile = rows.length;

      if (totalRowsInFile === 0) {
        warnings.push({ kind: "empty-file", message: "This file has no data rows." });
      }

      const emailColumnGuess = guessEmailColumn(rawHeaders, rows);
      if (!emailColumnGuess) {
        warnings.push({
          kind: "no-email-column",
          message: "No email column found. Every recipient needs an email address.",
          detail: `Your headers were: ${rawHeaders.join(", ")}.`,
        });
      }

      // De-dupe on the guessed email column (final de-dupe happens after mapping,
      // but we surface the count here using the best guess).
      let duplicatesRemoved = 0;
      if (emailColumnGuess) {
        const seen = new Set<string>();
        const deduped: Record<string, string>[] = [];
        for (const r of rows) {
          const key = normalizeEmail(r[emailColumnGuess] || "");
          if (key && seen.has(key)) {
            duplicatesRemoved++;
            continue;
          }
          if (key) seen.add(key);
          deduped.push(r);
        }
        rows = deduped;
        if (duplicatesRemoved > 0) {
          warnings.push({
            kind: "duplicates-removed",
            message: `${duplicatesRemoved} duplicate email${duplicatesRemoved === 1 ? "" : "s"} removed.`,
          });
        }
      }

      // Blank cells in non-email columns -> fallback note.
      const blankCols = new Set<string>();
      for (const h of rawHeaders) {
        if (h === emailColumnGuess) continue;
        if (rows.some((r) => !(r[h] || "").trim())) blankCols.add(h);
      }
      if (blankCols.size) {
        const n = rows.filter((r) =>
          [...blankCols].some((c) => !(r[c] || "").trim())
        ).length;
        warnings.push({
          kind: "blank-cells",
          message: `${n} row${n === 1 ? "" : "s"} with a blank cell (will use the variable's fallback).`,
          detail: `Columns: ${[...blankCols].join(", ")}`,
        });
      }

      resolve({
        fileName: file.name,
        sizeLabel: sizeLabel(file.size),
        headers: rawHeaders,
        rows,
        totalRowsInFile,
        warnings,
        hadBom,
        emailColumnGuess,
      });
    };
    reader.readAsText(file);
  });
}

/** Auto-match a CSV header to a variable key (case/spacing/synonym tolerant). */
export function autoMatchColumn(variable: VariableKey, headers: string[]): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");
  const v = norm(variable);
  const synonyms: Record<string, string[]> = {
    email: ["email", "emailaddress", "mail", "e-mail"],
    name: ["name", "fullname", "firstname", "studentname"],
    batch: ["batch", "cohort", "group"],
    course: ["course", "program", "track"],
  };
  const candidates = synonyms[v] ?? [v];
  for (const h of headers) {
    if (candidates.includes(norm(h))) return h;
  }
  // partial contains
  for (const h of headers) {
    if (norm(h).includes(v) || v.includes(norm(h))) return h;
  }
  return null;
}
