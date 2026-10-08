/**
 * Contact anatomy, measured like scripts/data/bdb2025_contact.py: for designed
 * runs, snap to handoff, handoff to first contact, first contact to tackle and
 * yards before/after first contact; for completions tackled in the field,
 * catch to first contact and first contact to tackle (seconds and yards). First
 * contact is the first hit, wrap, body bump, miss or broken tackle on the
 * carrier. Prints the NFL reference beside each figure when the extractor's
 * JSON is present.
 *   npx tsx scripts/contact-anatomy.ts [games] [seed] [leagues] [nfl-contact.json]
 */
import { existsSync, readFileSync } from 'node:fs';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam, type Team } from '../src/league/team.js';

const [gamesStr = '8', seedStr = '7', leaguesStr = '2', nflPath = 'out/budget/nfl-contact.json'] = process.argv.slice(2);
const games = Number(gamesStr);
const leagues = Number(leaguesStr);
const rng = new Rng(Number(seedStr));
const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
const per = Math.ceil(games / leagues);
const CONTACT = new Set(['hit', 'tackle_wrap', 'carrier_contact', 'missed_tackle', 'broken_tackle']);
const run: Record<string, number[]> = {};
const catches: Record<string, number[]> = {};
const add = (m: Record<string, number[]>, k: string, v: number) => (m[k] ??= []).push(v);
let teams: Team[] = [];

for (let g = 0; g < games; g++) {
  if (g % per === 0) {
    const lr = rng.fork(`league-${g / per}`);
    teams = names.map((n) => {
      const tr = lr.fork(n);
      return generateTeam(tr, n, n.slice(0, 3).toUpperCase(), { strength: tr.range(0.35, 0.75) });
    });
  }
  const i = rng.int(0, 7);
  let j = rng.int(0, 6);
  if (j >= i) j++;
  const res = simulateGame(teams[i], teams[j], { seed: rng.nextU32(), record: true });
  for (const p of res.log) {
    const rp = p.replay;
    if (!rp || p.nullified || (p.kind !== 'run' && p.kind !== 'pass')) continue;
    const ev = rp.events;
    const tackle = ev.find((e) => e.type === 'tackle');
    if (!tackle) continue;
    const xAt = (idx: number, t: number) => (rp.frames.find((f) => f.t >= t - 1e-6) ?? rp.frames[rp.frames.length - 1]).agents[idx * 3];
    const firstContact = (idx: number, from: number) => ev.find((e) => e.t >= from && CONTACT.has(e.type) && (e.a === idx || e.b === idx));
    if (p.kind === 'run' && !p.stats?.scramble) {
      const h = ev.find((e) => e.type === 'handoff');
      if (!h || h.b === undefined) continue;
      const fc = firstContact(h.b, h.t);
      if (!fc || fc.t > tackle.t) continue;
      add(run, 'snapToHandoff', h.t);
      add(run, 'handoffToContact', fc.t - h.t);
      add(run, 'contactToTackle', tackle.t - fc.t);
      add(run, 'yardsBeforeContact', xAt(h.b, fc.t) - rp.los);
      add(run, 'yardsAfterContact', xAt(h.b, tackle.t) - xAt(h.b, fc.t));
    } else if (p.kind === 'pass') {
      const c = ev.find((e) => e.type === 'catch');
      if (!c || c.a === undefined) continue;
      const fc = firstContact(c.a, c.t);
      if (!fc || fc.t > tackle.t) continue;
      add(catches, 'catchToContact', fc.t - c.t);
      add(catches, 'contactToTackle', tackle.t - fc.t);
      add(catches, 'yardsCatchToContact', xAt(c.a, fc.t) - xAt(c.a, c.t));
      add(catches, 'yardsAfterContact', xAt(c.a, tackle.t) - xAt(c.a, fc.t));
    }
  }
}

type Summ = { n: number; mean: number; median: number };
const nfl = existsSync(nflPath) ? (JSON.parse(readFileSync(nflPath, 'utf8')) as { designedRuns: Record<string, Summ>; completions: Record<string, Summ> }) : null;
const q = (v: number[], p: number) => [...v].sort((a, b) => a - b)[Math.floor(p * v.length)];
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
function show(title: string, m: Record<string, number[]>, ref?: Record<string, Summ>): void {
  console.log(title);
  for (const [k, v] of Object.entries(m)) {
    const r = ref?.[k];
    console.log(`  ${k.padEnd(20)} n ${String(v.length).padStart(4)}  mean ${mean(v).toFixed(2).padStart(5)}  p50 ${q(v, 0.5).toFixed(2).padStart(5)}` + (r ? `   [NFL mean ${r.mean}, p50 ${r.median}]` : ''));
  }
}
console.log(`${games} games`);
show('designed runs tackled in the field', run, nfl?.designedRuns);
show('completions tackled in the field', catches, nfl?.completions);
