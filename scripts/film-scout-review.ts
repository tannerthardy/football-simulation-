/** Offline review of saved #243 scouts. No simulation, detector execution or automatic football grades.
 * node --import tsx scripts/film-scout-review.ts --card saved.json --out out/scout-review
 * Optional: --seed 243 --notes review.json --films films.json (see docs/VALIDATION.md).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import type { Card, Settings } from './scorecard/provenance.js';
import type { GameRec } from './scorecard/records.js';
import type { DetectorId, WeirdEvent } from './scorecard/weird/types.js';
import type { CommandTraceStep } from '../src/sim/command-trace.js';

const IDS = ['presnap', 'turned', 'stuck', 'backpedal', 'slide'] as const;
const QUOTAS = { presnap: 1, turned: 3, stuck: 3, backpedal: 3, slide: 2 };
export const hash = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const canonical = (v: unknown): string => JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const rank = <T>(xs: T[], seed: number, key: (x: T) => string): T[] => [...xs].sort((a, b) => {
  const ka = key(a), kb = key(b);
  return hash(`${seed}:${ka}`).localeCompare(hash(`${seed}:${kb}`)) || ka.localeCompare(kb);
});

export interface Episode {
  key: string;
  kind: 'alert' | 'control';
  detector: DetectorId;
  play: string;
  /** A scorecard slot is stable within this saved game; no roster ID is invented. */
  actor: { team: 'O' | 'D' | null; slot: string; playerId: string | null };
  from: number;
  to: number;
  event: WeirdEvent;
  source: { commit: string; engineSha256: string | null; measurementSha256: string | null;
    settings: Settings | null; settingsSha256: string | null; inputSha256: string | null;
    arm: string; game: number; seed: number; node: string };
  /** The scout's representative intent is not an attribution of the raw controller request. */
  context: { responsibility: unknown; rawRequest: unknown; finalRequest: unknown; achieved: unknown;
    contactSupport: unknown; observations: unknown; opportunity: unknown };
  review: Review | null;
  film: { path: string; playId: string; sourceQualification: string } | null;
  trace?: { path: string; command: string[] | null; sourceQualification: string };
}
export type Verdict = 'defect' | 'legitimate' | 'unresolved';
export interface Review {
  key: string;
  verdict: Verdict;
  reason: string;
  competingExplanation: string;
  /** Existing per-play observation convention, kept beside the structured disposition. */
  userObservationParaphrase?: string;
  evidence?: string[];
  needsFootballJudgment?: boolean;
}
export interface Notes { sourceCardSha256: string; sourceSha256: string | null; notes: Review[] }
interface Pool { game: GameRec; event: WeirdEvent; from?: number }
export interface Queue {
  version: 1;
  cardSha256: string;
  recipe: { seed: number; quotas: typeof QUOTAS; controls: string; selection: string; source: string };
  population: Array<{ detector: DetectorId; stored: number; officialStored: number;
    officialCount: number | null; omittedAtLeast: number | null; controlCandidates: number }>;
  episodes: Episode[];
  warnings: string[];
}

const poolKey = (p: Pool) => canonical([p.game.game, p.game.inputSha256 ?? null, p.event,
  ...(p.from === undefined ? [] : [p.from])]);
const overlaps = (e: WeirdEvent, from: number, to: number) => e.t0 < to && e.t1 + 0.05 > from;

/** A control is negative only for this detector, on a complete official event stream.
 * Only interior half-second windows after 1s and before the last saved live event are used.
 * Selection is conditioned on an alert elsewhere in that play, not a recall sample.
 */
function controls(games: GameRec[], detector: DetectorId): Pool[] {
  return games.flatMap(game => {
    const all = game.weird?.events ?? [];
    const mine = all.filter(e => e.detector === detector && !e.nullified);
    const count = game.probe[`weird.${detector}.events`];
    if (!Number.isSafeInteger(count) || mine.length !== count) return [];
    const byPlay = new Map<string, WeirdEvent>();
    for (const e of [...mine].sort((a, b) => canonical(a).localeCompare(canonical(b))))
      if (e.t0 >= 1 && !byPlay.has(e.id)) byPlay.set(e.id, e);
    return [...byPlay.values()].flatMap(e => {
      const end = Math.max(...all.filter(x => x.id === e.id).map(x => x.t1 + 0.05));
      const out: Pool[] = [];
      for (let from = 1; from + 0.5 <= end + 1e-9; from += 0.5)
        if (!mine.some(x => x.id === e.id && overlaps(x, from, from + 0.5))) out.push({ game, event: e, from });
      return out;
    });
  });
}

export function makeQueue(card: Card, cardSha256: string, seed = 243): Queue {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new Error('seed must be a nonnegative safe integer');
  if (card.arms.length !== 1) throw new Error('Select a single saved arm; do not silently mix sources/settings');
  const arm = card.arms[0], games = arm.games;
  if (!games.length || !games.every(g => g.weird && Array.isArray(g.weird.events))) throw new Error('Missing saved scout evidence');
  if (new Set(games.map(g => g.game)).size !== games.length) throw new Error('Duplicate game identities');
  const pools = IDS.map(detector => ({ detector, items: games.flatMap(game => (game.weird?.events ?? [])
    .filter(event => event.detector === detector).map(event => ({ game, event }))) }));
  for (const { items } of pools) {
    if (new Set(items.map(poolKey)).size !== items.length) throw new Error('Duplicate event identity');
    for (const { event } of items) if (![event.t0, event.t1].every(Number.isFinite) || event.t1 < event.t0 || !event.players.length)
      throw new Error('Invalid saved scout event');
  }
  const episode = (p: Pool, kind: Episode['kind']): Episode => {
    const { game, event } = p, slot = event.players[0];
    const from = kind === 'alert' ? event.t0 : p.from!, to = kind === 'alert' ? event.t1 + 0.05 : from + 0.5;
    const key = hash(canonical([cardSha256, arm.name, poolKey(p), kind])).slice(0, 20);
    return { key, kind, detector: event.detector, play: event.id,
      actor: { slot, team: event.detector === 'turned' ? 'D' : event.detector === 'slide' ? null : 'O', playerId: null },
      from, to, event: structuredClone(event), source: { commit: card.meta.commit,
        engineSha256: card.meta.provenance?.engineSha256 ?? null,
        measurementSha256: card.meta.provenance?.measurementSha256 ?? null,
        settings: arm.settings ?? null, settingsSha256: arm.settings ? hash(canonical(arm.settings)) : null,
        inputSha256: game.inputSha256 ?? null, arm: arm.name, game: game.game, seed: game.seed, node: card.meta.node },
      context: { responsibility: null, rawRequest: null, finalRequest: kind === 'alert' ? event.intent ?? null : null,
        achieved: kind === 'alert' ? event.achieved ?? null : null, contactSupport: null, observations: null, opportunity: null },
      review: null, film: null };
  };
  const population = pools.map(({ detector, items }) => {
    const counts = games.map(g => g.probe[`weird.${detector}.events`]);
    const officialCount = counts.every(n => Number.isSafeInteger(n) && n >= 0) ? counts.reduce((a, b) => a + b, 0) : null;
    const officialStored = items.filter(p => !p.event.nullified).length;
    return { detector, stored: items.length, officialStored, officialCount,
      omittedAtLeast: officialCount === null ? null : Math.max(0, officialCount - officialStored),
      controlCandidates: controls(games, detector).length };
  });
  const alerts = pools.flatMap(({ detector, items }) => rank(items.filter(p => !p.event.nullified), seed, poolKey)
    .slice(0, QUOTAS[detector]).map(p => episode(p, 'alert')));
  const negative = (['turned', 'slide'] as const).flatMap(detector => rank(controls(games, detector), seed, poolKey)
    .slice(0, 3).map(p => episode(p, 'control')));
  return { version: 1, cardSha256, recipe: { seed, quotas: QUOTAS,
    controls: '3 turned + 3 slide; interior half-second windows starting at 1s or later, in plays with a same-detector alert elsewhere and complete official event counts; detector-specific absence only, eligibility unknown',
    selection: 'SHA256(seed:canonical game/input/event), sorted ascending; official non-nullified stored events only; capped severity-selected archives are not the full population',
    source: 'Historical saved scorecard; not a new accepted-build measurement or the film-room seed-7 252-clip list' },
    population, episodes: [...alerts, ...negative], warnings: [
      'No population precision/recall claim. Review proportions apply to this stratified retained sample only.',
      'Nullified events remain in source counts but are excluded from the sampled official cohort.',
      'Missing frames, jobs, raw commands, contact/support and reachable opportunities stay unknown; intent is not gaze.',
      'Slot identity is source/game-qualified. Actual player ID and even slide actor team require the original roster.',
    ] };
}

/** Labels apply to the exact saved card and episode; keep agent review and Tanner notes separate. */
export function applyNotes(q: Queue, notes: Notes): void {
  const source = q.episodes[0]?.source.engineSha256 ?? null;
  if (notes.sourceCardSha256 !== q.cardSha256 || notes.sourceSha256 !== source) throw new Error('Notes source mismatch');
  const known = new Map(q.episodes.map(e => [e.key, e]));
  const seen = new Set<string>();
  for (const n of notes.notes) {
    const e = known.get(n.key);
    if (!e || seen.has(n.key)) throw new Error('Unknown or duplicate episode in notes');
    if (!['defect', 'legitimate', 'unresolved'].includes(n.verdict) || !n.reason?.trim() || !n.competingExplanation?.trim())
      throw new Error('A verdict needs a reason and competing explanation');
    if (n.verdict !== 'unresolved' && !n.evidence?.length) throw new Error('Resolved labels require evidence references');
    e.review = structuredClone(n); seen.add(n.key);
  }
}

/** Film manifests are owner-supplied sidecars to existing replay envelopes, not an execution proof. */
export interface FilmManifest { entries: Array<{ key: string; path: string; sha256: string; engineSha256: string;
  settingsSha256: string; inputSha256: string; playId: string }>;
  traces?: Array<{ key: string; path: string; sha256: string; inputSha256: string }> }
export function attachFilms(q: Queue, manifest: FilmManifest, directory: string, read = readFileSync): void {
  const seen = new Set<string>();
  for (const f of manifest.entries) {
    const e = q.episodes.find(e => e.key === f.key);
    if (!e || seen.has(f.key)) throw new Error('Unknown or duplicate film entry');
    seen.add(f.key);
    if (!e.source.settingsSha256 || !e.source.inputSha256 || f.engineSha256 !== e.source.engineSha256
      || f.settingsSha256 !== e.source.settingsSha256 || f.inputSha256 !== e.source.inputSha256)
      throw new Error('Film source/settings/input mismatch or unavailable identity');
    const path = resolve(directory, f.path), bytes = read(path);
    if (hash(bytes) !== f.sha256) throw new Error('Film checksum mismatch');
    const text = bytes.toString('utf8');
    // Existing standalone replay format. Never execute JavaScript from an evidence file.
    const match = /const REPLAY = (\{[^\n]+\});/.exec(text);
    if (!match) throw new Error('Expected existing standalone replay envelope');
    const replay = JSON.parse(match[1]);
    const p = replay.plays.find((p: { id: string }) => p.id === f.playId);
    if (!p?.frames || (p.sourceSha256 ?? replay.meta?.sourceSha256) !== e.source.engineSha256
      || e.play.replace(/^sc\d+\//, '') !== f.playId) throw new Error('Film play/source mismatch');
    if (p.frames.t[0] > e.from || p.frames.t.at(-1) + 0.05 < e.to) throw new Error('Film does not cover selected window');
    const actors = p.roster.filter((a: string[]) => a[1] === e.actor.slot && (!e.actor.team || a[0] === e.actor.team));
    if (actors.length !== 1) throw new Error('Film actor missing or ambiguous');
    e.actor.team = actors[0][0];
    e.film = { path, playId: f.playId, sourceQualification: 'Frame source checked; settings/input declared by owner manifest, not independently re-executed' };
  }
  for (const t of manifest.traces ?? []) {
    const e = q.episodes.find(e => e.key === t.key), path = resolve(directory, t.path), bytes = read(path);
    if (!e || seen.has(`trace:${t.key}`)) throw new Error('Unknown or duplicate trace entry');
    seen.add(`trace:${t.key}`);
    if (hash(bytes) !== t.sha256) throw new Error('Trace checksum mismatch');
    const trace = JSON.parse(bytes.toString('utf8'));
    if (!e.source.inputSha256 || t.inputSha256 !== e.source.inputSha256
      || trace.meta?.engineSha256 !== e.source.engineSha256 || !trace.meta?.settings
      || hash(canonical(trace.meta.settings)) !== e.source.settingsSha256
      || trace.meta.input?.originalPlay !== e.play.replace(/^sc\d+\//, '')) throw new Error('Trace source/settings/input/play mismatch');
    const steps = (trace.steps as CommandTraceStep[]).filter(s => s.stepStart >= e.from && s.stepStart < e.to);
    if (!steps.length || steps.some(s => s.actor.slot !== e.actor.slot || (e.actor.team && s.actor.team !== e.actor.team)
      || s.actor.playerId !== steps[0].actor.playerId)) throw new Error('Trace actor/window mismatch');
    e.actor = { team: steps[0].actor.team, slot: steps[0].actor.slot, playerId: steps[0].actor.playerId };
    e.context = { responsibility: steps.map(s => ({ t: s.stepStart, evaluated: s.decision?.evaluated, owner: s.decision?.owner })),
      rawRequest: steps.map(s => ({ t: s.stepStart, command: s.decision?.raw ?? null })),
      finalRequest: steps.map(s => ({ t: s.stepStart, command: s.final ?? null, rewrites: s.rewrites })),
      achieved: steps.map(s => ({ t: s.endpointTime, body: s.endpoint?.body ?? null })),
      contactSupport: steps.map(s => ({ t: s.stepStart, engagement: s.start.engagement,
        tackleBond: s.start.tackleBond, support: s.start.body.support, precedingStepContacts: s.start.lastStepContacts })),
      observations: steps.map(s => ({ t: s.stepStart, reads: s.observations ?? null })),
      opportunity: steps.some(s => s.pursuit?.length) ? { qualification: 'Recorded pursuit estimates, not guaranteed arrival or useful football intervention',
        records: steps.filter(s => s.pursuit?.length).map(s => ({ t: s.stepStart, pursuit: s.pursuit })) } : null };
    e.trace = { path, command: trace.meta.command ?? null,
      sourceQualification: 'Existing command trace, selected steps only; game input join declared by manifest. Reachable opportunity and gaps outside recorded steps remain unknown.' };
  }
}

const md = (x: unknown) => String(x ?? 'unknown').replaceAll('|', '\\|').replaceAll('\n', ' ');
export function report(q: Queue, outputDirectory: string): string {
  const lines = ['# Film scout review queue', '', `Saved card SHA256: \`${q.cardSha256}\`. Selection seed: ${q.recipe.seed}.`,
    '', q.recipe.source, '', ...q.warnings.map(w => `- ${w}`), '', '## Sampling and denominators', '',
    q.recipe.selection, '', q.recipe.controls, '',
    '| Detector | Stored (incl. nullified) | Official stored | Official uncapped | Omitted at least | Negative-window candidates | Alerts: defect / legitimate / uncertain / unreviewed | Controls: defect / legitimate / uncertain / unreviewed |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |'];
  for (const p of q.population) {
    const counts = (kind: Episode['kind']) => {
      const es = q.episodes.filter(e => e.detector === p.detector && e.kind === kind);
      return [...(['defect', 'legitimate', 'unresolved'] as const).map(v => es.filter(e => e.review?.verdict === v).length),
        es.filter(e => !e.review).length].join(' / ') + ` (${es.length} sampled)`;
    };
    lines.push(`| ${p.detector} | ${p.stored} | ${p.officialStored} | ${p.officialCount ?? 'unknown'} | ${p.omittedAtLeast ?? 'unknown'} | ${p.controlCandidates} | ${counts('alert')} | ${counts('control')} |`);
  }
  lines.push('', 'These are counts, not an estimated population precision. Uncertain and unreviewed alerts are not successes or errors.',
    '', '## Tanner: ambiguous football shortlist', '');
  const shortlist = q.episodes.filter(e => e.review?.verdict === 'unresolved' && e.review.needsFootballJudgment && e.film);
  if (!shortlist.length) lines.push('None ready. Missing replay/trace access is an agent evidence task, not a football question for Tanner.');
  else for (const e of shortlist) lines.push(`- ${e.play} ${e.actor.slot}, ${e.from.toFixed(2)}–${e.to.toFixed(2)}s: ${e.review!.reason} ([existing replay](${relative(outputDirectory, e.film!.path)}); search ${e.film!.playId}, select player, seek to interval; Copy reference / Export clip).`);
  lines.push('', '## Preserved episodes', '');
  for (const e of q.episodes) {
    lines.push(`### ${e.key}: ${e.kind} / ${e.detector}`, '',
      `Film ${e.source.engineSha256 ?? 'unknown'} / ${e.play} / seed ${e.source.seed} / t=${e.from.toFixed(2)}–${e.to.toFixed(2)}s / player=${e.actor.team ?? '?'}:${e.actor.slot} (${e.actor.playerId ?? 'roster ID unknown'})`, '',
      `Source commit: \`${e.source.commit}\`; arm ${md(e.source.arm)}; game ${e.source.game}; settings \`${e.source.settingsSha256 ?? 'unknown'}\`; input \`${e.source.inputSha256 ?? 'unknown'}\`.`, '',
      `Scout claim: ${e.kind === 'alert' ? md(e.event.text) : 'No stored event in this window for this detector; complete official event counts. This does not establish rule eligibility or correct football.'}`, '',
      ...(e.kind === 'alert' && Number.isFinite(e.event.representativeT)
        ? [`Representative detector tick: **${e.event.representativeT!.toFixed(2)} s**. Windowed rules may summarize earlier samples; this is not a recorded decision time.`, ''] : []),
      `Observed responsibility: ${md(e.context.responsibility && JSON.stringify(e.context.responsibility))}. Raw controller request: ${md(e.context.rawRequest && JSON.stringify(e.context.rawRequest))}.`,
      `Final recorded request (scout representative intent when no trace): ${md(e.context.finalRequest && JSON.stringify(e.context.finalRequest))}. Achieved summary: ${md(e.context.achieved && JSON.stringify(e.context.achieved))}.`,
      `Contact/support: ${md(e.context.contactSupport && JSON.stringify(e.context.contactSupport))}. Observed reads: ${md(e.context.observations && JSON.stringify(e.context.observations))}.`,
      `Opportunity context: ${md(e.context.opportunity && JSON.stringify(e.context.opportunity))}.`, '',
      `Agent disposition: ${e.review?.verdict ?? 'unreviewed'}. ${e.review?.reason ?? 'No first pass supplied.'}`, '',
      `Competing explanation: ${e.review?.competingExplanation ?? 'unknown'}`, '',
      ...(e.review?.evidence ?? []).map(s => `Evidence: ${s}`),
      e.film ? `Replay: [${e.film.playId}](${relative(outputDirectory, e.film.path)}). ${e.film.sourceQualification}. Use the existing Copy reference and Export clip controls.`
        : 'Exact replay: unavailable in this saved card. A film-room seed recipe is not this scorecard game.',
      e.trace ? `Trace: [saved trace](${relative(outputDirectory, e.trace.path)}). ${e.trace.sourceQualification}. Recorded command: ${md(JSON.stringify(e.trace.command))}`
        : 'Exact capture/trace command: unavailable. Do not substitute a generated roster/call recipe.', '');
  }
  lines.push('## Controls and next decision', '', `${q.episodes.filter(e => e.kind === 'control').length} detector-specific unflagged windows retained. Their labels stay separate from alert precision. Six conditioned windows cannot establish reliable recall.`, '',
    'Next tool change: preserve a source/settings/input-qualified join from each alert to its existing saved replay/trace. If that join is unavailable, fix evidence access before adding detectors or asking Tanner to label dots.', '');
  return lines.join('\n');
}

function main() {
  const { values: v } = parseArgs({ options: { card: { type: 'string' }, seed: { type: 'string', default: '243' },
    out: { type: 'string', default: 'out/scout-review' }, notes: { type: 'string' }, films: { type: 'string' } } });
  if (!v.card) throw new Error('--card names one existing saved scorecard');
  const bytes = readFileSync(v.card), q = makeQueue(JSON.parse(bytes.toString('utf8')), hash(bytes), Number(v.seed));
  if (v.notes) applyNotes(q, JSON.parse(readFileSync(v.notes, 'utf8')));
  if (v.films) attachFilms(q, JSON.parse(readFileSync(v.films, 'utf8')), dirname(resolve(v.films)));
  const out = resolve(v.out!); mkdirSync(out, { recursive: true });
  const portable = structuredClone(q);
  for (const e of portable.episodes) {
    if (e.film) e.film.path = relative(out, e.film.path);
    if (e.trace) e.trace.path = relative(out, e.trace.path);
  }
  writeFileSync(resolve(out, 'queue.json'), JSON.stringify(portable, null, 2) + '\n');
  writeFileSync(resolve(out, 'review.md'), report(q, out));
  // Never overwrite a reviewer's existing notes when regenerating a report.
  if (!v.notes && !existsSync(resolve(out, 'notes-template.json'))) writeFileSync(resolve(out, 'notes-template.json'), JSON.stringify({ sourceCardSha256: q.cardSha256,
    sourceSha256: q.episodes[0]?.source.engineSha256 ?? null, notes: [] }, null, 2) + '\n', { flag: 'wx' });
  console.log(`${q.episodes.filter(e => e.kind === 'alert').length} alerts + ${q.episodes.filter(e => e.kind === 'control').length} controls; ${out}/review.md. Offline only; zero simulated games.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
