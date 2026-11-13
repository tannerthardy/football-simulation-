import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyNotes, attachFilms, hash, makeQueue, report, type FilmManifest, type Notes } from '../scripts/film-scout-review.js';
import type { Card } from '../scripts/scorecard/provenance.js';
import type { GameRec } from '../scripts/scorecard/records.js';
import type { DetectorId, WeirdEvent } from '../scripts/scorecard/weird/types.js';

const ids: DetectorId[] = ['presnap', 'turned', 'stuck', 'backpedal', 'slide'];
const event = (detector: DetectorId, play: number, extra: Partial<WeirdEvent> = {}): WeirdEvent => ({
  detector, id: `sc7/G1-P${String(play).padStart(3, '0')}`, play, players: [detector === 'turned' ? 'CB_W' : 'LG'],
  t0: 2, t1: 2.4, text: 'A saved geometric concern, not a football grade', severity: 1,
  intent: { vx: -2 }, achieved: { vx: -1 }, ...extra,
});
function fixture(): Card {
  const events = ids.flatMap((d, i) => Array.from({ length: 5 }, (_, p) => event(d, 1 + i * 10 + p)));
  const game = { game: 0, seed: 12345, inputSha256: 'saved-input', weird: { events, ms: 1 },
    probe: Object.fromEntries(ids.map(d => [`weird.${d}.events`, 5])), plays: [] } as unknown as GameRec;
  return { meta: { commit: 'historical-producer', seed: 7, games: 1, leagues: 1, node: 'v22.23.3', date: 'fixture',
    provenance: { engineSha256: 'saved-engine', measurementSha256: 'saved-detectors', lockfileSha256: 'lock',
      platform: 'linux', arch: 'x64', cpuModel: null, cpuQuotaCores: null, execution: 'node --import tsx' } },
    arms: [{ name: 'saved', env: {}, settings: { EXAMPLE: true }, games: [game] }] };
}
const dirs: string[] = [];
function temporary() { const d = mkdtempSync(join(tmpdir(), 'scout-review-')); dirs.push(d); return d; }
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true }); });

describe('frozen offline scout queue', () => {
  it('carries a known representative tick to the report without inventing one for legacy evidence', () => {
    const card = fixture();
    for (const e of card.arms[0].games[0].weird!.events) e.representativeT = e.t1;
    const before = structuredClone(card), queue = makeQueue(card, 'card');
    const alert = queue.episodes.find(e => e.kind === 'alert')!;
    expect(report(queue, '.')).toContain(`Representative detector tick: **${alert.event.t1.toFixed(2)} s**`);
    expect(card).toEqual(before);
    expect(report(makeQueue(fixture(), 'legacy'), '.')).not.toContain('Representative detector tick:');
  });
  it('samples twelve alerts and six negative windows without mutating evidence or depending on event order', () => {
    const card = fixture(), before = structuredClone(card);
    const a = makeQueue(card, 'card', 243);
    expect(a.episodes.filter(e => e.kind === 'alert')).toHaveLength(12);
    expect(a.episodes.filter(e => e.kind === 'control')).toHaveLength(6);
    expect(card).toEqual(before);
    const shuffled = structuredClone(card);
    shuffled.arms[0].games[0].weird!.events.reverse();
    expect(makeQueue(shuffled, 'card', 243)).toEqual(a);
    expect(makeQueue(card, 'card', 244).episodes.map(e => e.key)).not.toEqual(a.episodes.map(e => e.key));
    expect(a.episodes[0].source.seed).toBe(12345); // Not the film-room seed or top-level panel seed.
    for (const e of a.episodes.filter(e => e.kind === 'control')) {
      expect(e.from).toBeGreaterThanOrEqual(1); // Not a guaranteed-negative pre-history window.
      expect(e.to - e.from).toBe(0.5);
      expect(card.arms[0].games[0].weird!.events.some(x => x.id === e.play && x.detector === e.detector
        && x.t0 < e.to && x.t1 + 0.05 > e.from)).toBe(false);
    }
  });
  it('does not infer absent alerts from a capped or missing event stream', () => {
    const card = fixture(), game = card.arms[0].games[0];
    game.probe['weird.turned.events'] = 100;
    delete game.probe['weird.slide.events'];
    const q = makeQueue(card, 'card');
    expect(q.episodes.filter(e => e.kind === 'control')).toHaveLength(0);
    expect(q.population.find(p => p.detector === 'turned')).toMatchObject({ officialStored: 5, officialCount: 100, omittedAtLeast: 95 });
    expect(q.population.find(p => p.detector === 'slide')!.officialCount).toBeNull();
  });
  it('excludes nullified alerts, distinguishes official/stored counts, and preserves adverse event text', () => {
    const card = fixture(), game = card.arms[0].games[0];
    game.weird!.events.push(event('turned', 77, { nullified: true, text: 'penalty erased the official play' }));
    game.weird!.events[0].text = 'Unfavorable recorded contact';
    const q = makeQueue(card, 'card');
    expect(q.population.find(p => p.detector === 'turned')).toMatchObject({ stored: 6, officialStored: 5, officialCount: 5 });
    expect(q.episodes.every(e => !e.event.nullified)).toBe(true);
    expect(card.arms[0].games[0].weird!.events[0].text).toBe('Unfavorable recorded contact');
  });
  it('never maps scout final intents to raw requests, contact absence, responsibility or useful opportunities', () => {
    const q = makeQueue(fixture(), 'card');
    for (const e of q.episodes) {
      expect(e.actor.playerId).toBeNull(); expect(e.context.rawRequest).toBeNull();
      expect(e.context.contactSupport).toBeNull(); expect(e.context.opportunity).toBeNull();
      expect(e.context.responsibility).toBeNull();
    }
    expect(q.episodes.find(e => e.kind === 'alert')!.context.finalRequest).toEqual({ vx: -2 });
    expect(q.episodes.find(e => e.kind === 'control')!.context.finalRequest).toBeNull();
  });
  it('preserves unavailable legacy identity and refuses source mixing', () => {
    const card = fixture(); delete card.meta.provenance; delete card.arms[0].settings;
    delete card.arms[0].games[0].inputSha256;
    expect(makeQueue(card, 'card').episodes[0].source).toMatchObject({ engineSha256: null, settingsSha256: null, inputSha256: null });
    card.arms.push(structuredClone(card.arms[0]));
    expect(() => makeQueue(card, 'card')).toThrow('single saved arm');
  });
  it('keeps unreviewed, uncertain and resolved dispositions distinct and requires evidence for resolution', () => {
    const q = makeQueue(fixture(), 'card');
    expect(report(q, '.')).toContain('0 / 0 / 0 / 1 (1 sampled)');
    const e = q.episodes[0];
    const notes: Notes = { sourceCardSha256: 'card', sourceSha256: 'saved-engine', notes: [{ key: e.key,
      verdict: 'unresolved', reason: 'No trace', competingExplanation: 'Valid contact', needsFootballJudgment: true }] };
    applyNotes(q, notes);
    expect(report(q, '.')).toContain('0 / 0 / 1 / 0 (1 sampled)');
    expect(report(q, '.')).toContain('None ready.'); // An unresolved case without film is not sent to Tanner.
    notes.notes[0].verdict = 'legitimate';
    expect(() => applyNotes(q, notes)).toThrow('evidence');
    notes.notes[0].evidence = ['Pinned trace confirms a legitimate physical constraint'];
    applyNotes(q, notes);
    expect(report(q, '.')).toContain('0 / 1 / 0 / 0 (1 sampled)');
    notes.sourceCardSha256 = 'different';
    expect(() => applyNotes(q, notes)).toThrow('source mismatch');
  });
  it('checks source/settings/input, bytes, play, actor and interval before linking existing replay', () => {
    const q = makeQueue(fixture(), 'card'), e = q.episodes[0], d = temporary(), path = join(d, 'original.html');
    const data = { meta: { sourceSha256: 'saved-engine' }, plays: [{ id: e.play.replace('sc7/', ''),
      roster: [['O', e.actor.slot, 'Name', 77]], frames: { t: [-4, 0, 3] } }] };
    const bytes = Buffer.from(`const REPLAY = ${JSON.stringify(data)};\n`); writeFileSync(path, bytes);
    const manifest: FilmManifest = { entries: [{ key: e.key, path: 'original.html', sha256: hash(bytes),
      engineSha256: 'saved-engine', settingsSha256: e.source.settingsSha256!, inputSha256: 'saved-input',
      playId: e.play.replace('sc7/', '') }] };
    attachFilms(q, manifest, d); expect(e.film?.playId).toBe(e.play.replace('sc7/', ''));
    for (const [field, wrong] of [['settingsSha256', 'wrong'], ['inputSha256', 'wrong'], ['sha256', 'wrong'], ['playId', 'G1-P999']] as const) {
      const bad = structuredClone(manifest); bad.entries[0][field] = wrong;
      expect(() => attachFilms(q, bad, d)).toThrow();
    }
    const missing = structuredClone(data); missing.plays[0].roster = [];
    const text = `const REPLAY = ${JSON.stringify(missing)};\n`; writeFileSync(path, text);
    manifest.entries[0].sha256 = hash(text);
    expect(() => attachFilms(q, manifest, d)).toThrow('actor');
  });
  it('CLI is offline, portable and idempotent, keeps input bytes and optional notes unchanged', () => {
    const d = temporary(), path = join(d, 'card.json'), out = join(d, 'queue');
    const bytes = JSON.stringify(fixture()); writeFileSync(path, bytes);
    const args = ['--import', 'tsx', 'scripts/film-scout-review.ts', '--card', path, '--out', out];
    const run = () => execFileSync(process.execPath, args, { encoding: 'utf8' });
    expect(run()).toContain('zero simulated games');
    const first = readFileSync(join(out, 'queue.json'), 'utf8');
    const notes = join(out, 'notes-template.json'); writeFileSync(notes, 'retained user notes');
    run(); expect(readFileSync(join(out, 'queue.json'), 'utf8')).toBe(first);
    expect(readFileSync(path, 'utf8')).toBe(bytes); expect(readFileSync(notes, 'utf8')).toBe('retained user notes');
  });
  it('copies an existing selected-actor trace without inventing opportunity or using endpoint behavior as owner', () => {
    const q = makeQueue(fixture(), 'card'), e = q.episodes.find(e => e.detector === 'turned' && e.kind === 'alert')!;
    const d = temporary(), path = join(d, 'trace.json');
    const actor = { team: 'D', slot: e.actor.slot, playerId: 'D-CB5', index: 7 };
    const trace = { meta: { engineSha256: 'saved-engine', settings: { EXAMPLE: true },
      input: { originalPlay: e.play.replace('sc7/', '') }, command: ['scripts/diag/command-trace.ts', '--capture', 'play.bin'] },
      steps: [{ actor, stepStart: 2, endpointTime: 2.05,
        decision: { evaluated: true, owner: { controller: 'ManCoverage' }, raw: { vel: { x: 9, y: 0 } } },
        rewrites: [], final: { vel: { x: 9, y: 0 } }, start: { engagement: null, tackleBond: null,
          lastStepContacts: [], body: { support: null } }, endpoint: { behavior: { controller: 'Pursuit' }, body: { velocity: { x: 6, y: 0 } } } }] };
    const text = JSON.stringify(trace); writeFileSync(path, text);
    const manifest: FilmManifest = { entries: [], traces: [{ key: e.key, path: 'trace.json', sha256: hash(text), inputSha256: 'saved-input' }] };
    attachFilms(q, manifest, d);
    expect(e.actor.playerId).toBe('D-CB5');
    expect(e.context.responsibility).toEqual([{ t: 2, evaluated: true, owner: { controller: 'ManCoverage' } }]);
    expect(e.context.rawRequest).toEqual([{ t: 2, command: { vel: { x: 9, y: 0 } } }]);
    expect(e.context.opportunity).toBeNull();
    (trace.steps[0] as unknown as Record<string, unknown>).pursuit = [{ phase: 'decision', target: actor,
      data: { intercept: { estimate: { physicalGuarantee: false } } } }];
    const annotated = JSON.stringify(trace); writeFileSync(path, annotated); manifest.traces![0].sha256 = hash(annotated);
    attachFilms(q, manifest, d);
    expect(e.context.opportunity).toMatchObject({ qualification: expect.stringContaining('not guaranteed') });
    manifest.traces![0].inputSha256 = 'different-game';
    expect(() => attachFilms(q, manifest, d)).toThrow('mismatch');
  });
});
