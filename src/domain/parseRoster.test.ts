import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseRoster, parseRosterWithMapping } from './parseRoster';

function csvBuffer(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function xlsxBuffer(rows: Array<Record<string, string>>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return out as ArrayBuffer;
}

describe('parseRoster', () => {
  it('parses a valid CSV with Name and Company', async () => {
    const buf = csvBuffer('Name,Company\nAlice,Acme\nBob,Beta\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.errors).toEqual([]);
    expect(result.people.map((p) => ({ name: p.name, company: p.company }))).toEqual([
      { name: 'Alice', company: 'Acme' },
      { name: 'Bob', company: 'Beta' },
    ]);
    expect(new Set(result.people.map((p) => p.id)).size).toBe(2);
  });

  it('parses an xlsx buffer', async () => {
    const buf = xlsxBuffer([
      { Name: 'Alice', Company: 'Acme' },
      { Name: 'Bob', Company: 'Beta' },
    ]);
    const result = await parseRoster(buf, 'roster.xlsx');
    expect(result.errors).toEqual([]);
    expect(result.people).toHaveLength(2);
  });

  it('accepts missing Company (empty string)', async () => {
    const buf = csvBuffer('Name,Company\nAlice,\nBob,Beta\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.errors).toEqual([]);
    expect(result.people[0].company).toBe('');
  });

  it('reports rows with missing Name', async () => {
    const buf = csvBuffer('Name,Company\n,Acme\nBob,Beta\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ rowIndex: 2, reason: 'missing_name' });
    expect(result.people).toHaveLength(1);
    expect(result.people[0].name).toBe('Bob');
  });

  it('reports duplicate names', async () => {
    const buf = csvBuffer('Name,Company\nAlice,Acme\nAlice,Beta\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ rowIndex: 3, reason: 'duplicate_name' });
  });

  it('reports missing Name column and exposes detected columns + raw rows', async () => {
    const buf = csvBuffer('First,Firm\nAlice,Acme\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.people).toEqual([]);
    expect(result.errors[0]).toMatchObject({ rowIndex: 1, reason: 'missing_name_column' });
    expect(result.detectedColumns).toEqual(['First', 'Firm']);
    expect(result.rawRows).toHaveLength(1);
    expect(result.rawRows?.[0]).toMatchObject({ First: 'Alice', Firm: 'Acme' });
  });

  it('parseRosterWithMapping uses explicit column names', () => {
    const rows = [
      { First: 'Alice', Firm: 'Acme' },
      { First: 'Bob', Firm: 'Beta' },
    ];
    const result = parseRosterWithMapping(rows, 'First', 'Firm');
    expect(result.errors).toEqual([]);
    expect(result.people.map((p) => ({ name: p.name, company: p.company }))).toEqual([
      { name: 'Alice', company: 'Acme' },
      { name: 'Bob', company: 'Beta' },
    ]);
  });

  it('skips fully empty rows silently', async () => {
    const buf = csvBuffer('Name,Company\nAlice,Acme\n,\nBob,Beta\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.errors).toEqual([]);
    expect(result.people).toHaveLength(2);
  });
});
