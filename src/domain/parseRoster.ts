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
}

export async function parseRoster(
  buffer: ArrayBuffer,
  _filename: string,
): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  const errors: RowError[] = [];
  const people: Person[] = [];

  if (rows.length === 0) {
    return { people, errors };
  }

  const nameKey = findKey(rows[0], ['name', 'full name', 'attendee']);
  const companyKey = findKey(rows[0], ['company', 'organization', 'organisation', 'org']);

  if (!nameKey) {
    errors.push({
      rowIndex: 1,
      reason: 'missing_name_column',
      message: 'The first sheet must have a "Name" column.',
    });
    return { people, errors };
  }

  const seen = new Set<string>();

  rows.forEach((row, idx) => {
    // idx 0 corresponds to the first data row → Excel row 2 (header = row 1).
    const excelRow = idx + 2;
    const name = String(row[nameKey] ?? '').trim();
    const company = companyKey ? String(row[companyKey] ?? '').trim() : '';

    if (!name && !company) {
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
