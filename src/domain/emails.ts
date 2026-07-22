import type { EventParams, Person, Schedule } from '../domain/types';

export type EmailMode = 'invite' | 'followup';

export interface EmailDraft {
  to: string;
  subject: string;
  greeting: string;
  intro: string;
  rows: Array<{ col1: string; col2: string; col3: string }>;
  colHeaders: [string, string, string];
  outro: string;
  plainText: string;
}

function talkDuration(params: EventParams): string {
  const talk = Math.max(0, params.roundSeconds - params.moveSeconds);
  const m = Math.floor(talk / 60);
  const s = talk % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function buildInviteEmail(
  person: Person,
  roster: Person[],
  params: EventParams,
  schedule: Schedule | undefined,
  projectName: string,
): EmailDraft {
  const byId = new Map(roster.map((p) => [p.id, p]));
  const rounds = schedule?.rounds ?? [];
  const rows = rounds.map((round, r) => {
    const group = round.groups.find((g) => g.memberIds.includes(person.id));
    if (!group) {
      return { col1: String(r + 1), col2: '—', col3: 'sitting out this round' };
    }
    const area = params.areas.find((a) => a.id === group.areaId)?.label ?? group.areaId;
    const meet = group.memberIds
      .filter((id) => id !== person.id)
      .map((id) => byId.get(id)?.name ?? id)
      .join(', ');
    return { col1: String(r + 1), col2: area, col3: meet || '—' };
  });

  const greeting = `Hi ${person.name.split(' ')[0]},`;
  const intro =
    `Your speed-networking schedule is below: ${rounds.length || params.numRounds} rounds of ` +
    `${talkDuration(params)} each, with ${params.moveSeconds} seconds to move between areas. ` +
    `Areas are marked with large letter signs — just find yours before each round starts.`;
  const outro =
    "Tip: you don't need to remember any of this — you'll also get a printed tear-off plan at check-in.";
  const subject = `Your personal plan — ${projectName}`;
  const plainLines = [
    `To: ${person.email || ''}`,
    `Subject: ${subject}`,
    '',
    greeting,
    '',
    intro,
    '',
    'Round | Area | You\'ll meet',
    ...rows.map((r) => `${r.col1} | ${r.col2} | ${r.col3}`),
    '',
    outro,
  ];

  return {
    to: person.email || '',
    subject,
    greeting,
    intro,
    rows,
    colHeaders: ['Round', 'Area', "You'll meet"],
    outro,
    plainText: plainLines.join('\n'),
  };
}

export function buildFollowUpEmail(
  person: Person,
  roster: Person[],
  schedule: Schedule | undefined,
  projectName: string,
): EmailDraft {
  const quality = schedule?.quality.perPerson.find((p) => p.id === person.id);
  const byId = new Map(roster.map((p) => [p.id, p]));
  const metIds = quality?.metIds ?? [];
  const never = quality?.neverMetIds.length ?? Math.max(0, roster.length - 1 - metIds.length);
  const rows = metIds.map((id) => {
    const p = byId.get(id);
    return {
      col1: p?.name ?? id,
      col2: p?.company || '–',
      col3: p?.email || '–',
    };
  });

  const greeting = `Hi ${person.name.split(' ')[0]},`;
  const intro = `Great meeting you at ${projectName}. Here is everyone you connected with:`;
  const outro =
    never > 0
      ? `You still had ${never} people you didn't meet — worth a follow-up if you spot them around.`
      : 'You covered the full room — impressive.';
  const subject = `People you met — ${projectName}`;
  const plainLines = [
    `To: ${person.email || ''}`,
    `Subject: ${subject}`,
    '',
    greeting,
    '',
    intro,
    '',
    'Name | Company | Email',
    ...rows.map((r) => `${r.col1} | ${r.col2} | ${r.col3}`),
    '',
    outro,
  ];

  return {
    to: person.email || '',
    subject,
    greeting,
    intro,
    rows,
    colHeaders: ['Name', 'Company', 'Email'],
    outro,
    plainText: plainLines.join('\n'),
  };
}

/** Build a draft .eml with X-Unsent:1 so desktop clients open it as unsent. */
export function toEml(draft: EmailDraft): string {
  const body = [
    draft.greeting,
    '',
    draft.intro,
    '',
    draft.colHeaders.join(' | '),
    ...draft.rows.map((r) => `${r.col1} | ${r.col2} | ${r.col3}`),
    '',
    draft.outro,
  ].join('\r\n');

  return [
    'X-Unsent: 1',
    `To: ${draft.to}`,
    `Subject: ${draft.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ].join('\r\n');
}
