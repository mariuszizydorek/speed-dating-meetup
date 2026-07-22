import * as XLSX from 'xlsx';
import { nanoid } from 'nanoid';
import type { Person } from './types';

export type RowErrorReason =
  | 'missing_name_column'
  | 'missing_name'
  | 'duplicate_name';

export interface RowError {
  rowIndex: number; // 1-based, matching what the user sees in Excel (header = row 1)
  reason: RowErrorReason;
  message: string;
}

export interface ParseResult {
  people: Person[];
  errors: RowError[];
  /** Populated (alongside `rawRows`) when the parser could not auto-detect a Name column. */
  detectedColumns?: string[];
  /** Populated (alongside `detectedColumns`) so callers can re-map without re-reading the file. */
  rawRows?: Record<string, unknown>[];
}

export async function parseRoster(
  buffer: ArrayBuffer,
  _filename: string,
): Promise<ParseResult> {
  const rows = readRows(buffer);

  if (rows.length === 0) {
    return { people: [], errors: [] };
  }

  const nameKey = findKey(rows[0], ['name', 'full name', 'attendee']);
  const companyKey = findKey(rows[0], ['company', 'organization', 'organisation', 'org']);
  const emailKey = findKey(rows[0], ['email', 'e-mail', 'mail', 'email address']);

  if (!nameKey) {
    return {
      people: [],
      errors: [{
        rowIndex: 1,
        reason: 'missing_name_column',
        message: 'The first sheet must have a "Name" column.',
      }],
      detectedColumns: Object.keys(rows[0]),
      rawRows: rows,
    };
  }

  return buildPeople(rows, nameKey, companyKey, emailKey);
}

/**
 * Parse rows using explicit column mappings, skipping auto-detection.
 * Use when the auto-detection failed and the user picked columns via the mapper UI.
 */
export function parseRosterWithMapping(
  rows: Record<string, unknown>[],
  nameCol: string,
  companyCol?: string,
  emailCol?: string,
): ParseResult {
  if (rows.length === 0) return { people: [], errors: [] };
  return buildPeople(rows, nameCol, companyCol, emailCol);
}

function readRows(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
}

function buildPeople(
  rows: Record<string, unknown>[],
  nameKey: string,
  companyKey: string | undefined,
  emailKey: string | undefined,
): ParseResult {
  const errors: RowError[] = [];
  const people: Person[] = [];
  const seen = new Set<string>();

  rows.forEach((row, idx) => {
    // idx 0 corresponds to the first data row → Excel row 2 (header = row 1).
    const excelRow = idx + 2;
    const name = String(row[nameKey] ?? '').trim();
    const company = companyKey ? String(row[companyKey] ?? '').trim() : '';
    const email = emailKey ? String(row[emailKey] ?? '').trim() : '';

    if (!name && !company && !email) {
      return;
    }
    if (!name) {
      errors.push({
        rowIndex: excelRow,
        reason: 'missing_name',
        message: `Row ${excelRow}: missing Name.`,
      });
      return;
    }
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      errors.push({
        rowIndex: excelRow,
        reason: 'duplicate_name',
        message: `Row ${excelRow}: duplicate name "${name}".`,
      });
      return;
    }
    seen.add(lower);
    people.push({
      id: nanoid(10),
      name,
      company,
      email,
      rowIndex: excelRow,
    });
  });

  return { people, errors };
}

function findKey(sample: Record<string, unknown>, aliases: string[]): string | undefined {
  const keys = Object.keys(sample);
  const lowerMap = new Map(keys.map((k) => [k.toLowerCase().trim(), k] as const));
  for (const alias of aliases) {
    const hit = lowerMap.get(alias);
    if (hit) return hit;
  }
  return undefined;
}
