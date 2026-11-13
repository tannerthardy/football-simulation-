/** Pass-protection reps in the sim, traced (observation only; flags from the
 * environment). Real coordinators call each snap over the 2022 situations
 * (as scripts/diag/align/sim_snapframe.ts); dropbacks are ticked to the
 * throw (or 4 s). For each pass engagement: who (blocker slot, rusher's
 * spot at the snap), every rush move tried and whether it landed, how and
 * when the rep ended (a shed's reason from the play events, the throw, or
 * coming apart), and when the rusher first stood nearer the QB than his
 * blocker (scripts/diag/passpro/pressure.py's "past").
 *
 *   node --import tsx scripts/diag/passpro/reps.ts [--n 600] [--seed 1] [--out out/passpro/reps.jsonl]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y, HASH_LEFT_Y, HASH_RIGHT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { DefensiveCoordinator, OffensiveCoordinator, type Situation } from '../../../src/game/playcaller.js';
import { alignStyle, generateTeam, pickDefense, pickOffense, type DefScheme } from '../../../src/league/team.js';
import type { Agent, Engagement } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const N = Number(arg('n', '600'));
const SEED = Number(arg('seed', '1'));
const OUT = arg('out', 'out/passpro/reps.jsonl');

const rng = new Rng(SEED);
const schemes: DefScheme[] = ['4-3', '3-4', 'nickel-heavy'];
const teams = Array.from({ length: 6 }, (_, i) => generateTeam(rng.fork(`team${i}`), `T${i}`, `T${i}`, { strength: 0.55, defScheme: schemes[i % 3] }));
const SITS: Array<[number, number]> = [[1, 10], [1, 10], [2, 7], [2, 10], [2, 4], [3, 7], [3, 4], [3, 10], [3, 2]];
const hashes = [HASH_LEFT_Y, CENTER_Y, HASH_RIGHT_Y];

interface Rep {
  play: number; blocker: string; rusher: string; spot: 'edge' | 'inside'; start: number;
  moves: Array<[string, boolean, number]>; end?: number; why?: string; phiEnd?: number; past?: number;
  helpers: number;
}
const reps: Rep[] = [];
let plays = 0;
for (let k = 0; plays < N && k < N * 6; k++) {
  const [down, distance] = SITS[rng.int(0, SITS.length - 1)];
  const off = teams[rng.int(0, teams.length - 1)];
  let def = teams[rng.int(0, teams.length - 1)];
  if (def === off) def = teams[(teams.indexOf(off) + 1) % teams.length];
  const sit: Situation = { down, distance, yardline: 20 + rng.int(0, 55), quarter: 1, clock: 600, scoreDiff: 0, ballY: hashes[k % 3], hurry: false };
  const offCall = new OffensiveCoordinator(off, rng.fork(`oc${k}`)).call(sit, def);
  if (offCall.kind !== 'pass') continue;
  const offPlayers = pickOffense(off, offCall.formation.personnel);
  const { call: defCall, prefs } = new DefensiveCoordinator(def, rng.fork(`dc${k}`)).call(sit, offCall.formation.personnel, off, offPlayers, offCall.formation);
  const los = 10 + sit.yardline;
  let sim: PlaySim;
  try {
    sim = new PlaySim({ offense: offPlayers, defense: pickDefense(def, defCall.personnel), offCall, defCall, los, ballY: sit.ballY,
      firstDownX: Math.min(110, los + distance), seed: rng.nextU32(), manPrefs: prefs, down, offStyle: alignStyle(off), defStyle: alignStyle(def) });
  } catch { continue; }
  plays++;
  const tick = (sim as unknown as { tick(): void }).tick.bind(sim);
  const lt = sim.slot('LT'), rt = sim.slot('RT');
  const tackleY = (y: number) => Math.abs(((y > sim.ballY ? (lt && rt ? (lt.pos.y > rt.pos.y ? lt : rt) : null) : (lt && rt ? (lt.pos.y > rt.pos.y ? rt : lt) : null))?.pos.y ?? sim.ballY) - sim.ballY);
  const snapY = new Map<Agent, number>();
  const open = new Map<Engagement, Rep>();
  const lastMove = new Map<Engagement, number>();
  const pastAt = new Map<string, number>();
  while (sim.phase === 'live' && sim.t < 4) {
    if (!snapY.size && sim.t > 0) for (const d of sim.defense) snapY.set(d, d.pos.y);
    const before = sim.events.length;
    tick();
    if (sim.throwAt >= 0 || sim.carrier !== sim.qb) break;
    const now = new Set(sim.engagements.filter(e => e.type === 'pass'));
    for (const e of now) {
      let r = open.get(e);
      if (!r) {
        const y0 = snapY.get(e.defender) ?? e.defender.pos.y;
        r = { play: plays, blocker: e.blocker.slot, rusher: e.defender.slot, start: sim.t, moves: [], helpers: 0,
          spot: Math.abs(y0 - sim.ballY) > tackleY(y0) + .5 ? 'edge' : 'inside' };
        open.set(e, r);
        reps.push(r);
      }
      r.helpers = Math.max(r.helpers, e.helpers.length);
      if (lastMove.get(e) !== e.nextMoveAt && sim.t - e.start >= 0.1) {
        lastMove.set(e, e.nextMoveAt);
        r.moves.push([e.move, e.moveOk, +sim.t.toFixed(2)]);
      }
      const key = `${r.blocker}:${r.rusher}`;
      const q = sim.qb.pos, b = e.blocker.pos, d = e.defender.pos;
      if (!pastAt.has(key) && Math.hypot(d.x - q.x, d.y - q.y) < Math.hypot(b.x - q.x, b.y - q.y) - .3) pastAt.set(key, sim.t);
      r.phiEnd = e.phi;
    }
    for (const [e, r] of open) {
      if (now.has(e) || r.end !== undefined) continue;
      r.end = +sim.t.toFixed(2);
      const shed = sim.events.slice(before).find(ev => ev.type === 'shed' && ev.a === e.defender.idx && ev.b === e.blocker.idx);
      r.why = shed?.note ?? 'apart/other';
    }
  }
  for (const r of open.values()) {
    if (r.end === undefined) { r.end = +sim.t.toFixed(2); r.why = sim.throwAt >= 0 ? 'throw' : 'live at end'; }
    const p = pastAt.get(`${r.blocker}:${r.rusher}`);
    if (p !== undefined) r.past = +p.toFixed(2);
  }
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, reps.map(r => JSON.stringify(r)).join('\n') + '\n');
console.error(`${plays} dropbacks, ${reps.length} reps -> ${OUT}`);
