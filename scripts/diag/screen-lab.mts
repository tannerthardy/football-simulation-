/**
 * Screen lab: run each installed screen (SCREEN_CONCEPTS) against a set of
 * defensive calls and seeds, print what happened, and write every play in the
 * common play format so scripts/mechanics/screen_reference.py measures the sim
 * with the same code it uses on NFL tracking.
 *
 *   tsx scripts/diag/screen-lab.mts [--seeds 8] [--only rb_slip_screen,te_screen] [--off-man] [--out out/screens/sim-screens.jsonl.gz]
 *   python3 -I scripts/mechanics/screen_reference.py out/screens/sim-screens.jsonl.gz --by type
 *
 * Teams are fixed (seeded) and equal strength. Each snap alternates the
 * formation's flip by seed. Positions are sampled every 0.1 s from the snap;
 * x is yards past the line in the offense's direction.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RPO_CONCEPTS, RUN_BY_ID, SCREEN_BY_ID, SCREEN_CONCEPTS } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';

const arg = (name: string, d: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : d; };
const SEEDS = Number(arg('--seeds', '8'));
const ONLY = arg('--only', '').split(',').filter(Boolean);
const OUT = arg('--out', 'out/screens/sim-screens.jsonl.gz');
/** --off-man adds Nickel Over Cover 1 Off (off-man corners) to the four calls. */
const OFF_MAN = process.argv.includes('--off-man');
/** --audibles lets the QB make his discretionary pre-snap checks. Installed
 * checks (a screen's kill, an option's read) are always made. A killed screen
 * or a handed-off option is not written as a screen; it is summarized
 * ("killed": the call went the other way). */
const AUDIBLES = process.argv.includes('--audibles');

/** The formation each screen is drawn from. */
const FORMATION: Record<string, string> = {
  rb_slip_screen: 'gun_doubles_11', te_screen: 'gun_trey_11', bubble_screen: 'gun_trips_11',
  bunch_now_screen: 'gun_bunch_11', tunnel_screen: 'gun_doubles_11', wide_now_screen: 'gun_doubles_11',
};
/** Defensive calls: zone, man (press), two-high, and a pressure. */
const DEFENSES = [
  { label: 'Nickel Over Cover 3', front: 'over', coverage: 'cover3', pressure: null },
  { label: 'Nickel Over Cover 1', front: 'over', coverage: 'cover1', pressure: null },
  { label: 'Nickel Over Cover 2', front: 'over', coverage: 'cover2', pressure: null },
  { label: 'Nickel Over Cover 1 Mike A', front: 'over', coverage: 'cover1', pressure: 'mike_a' },
  ...(OFF_MAN ? [{ label: 'Nickel Over Cover 1 Off', front: 'over', coverage: 'cover1_off', pressure: null }] : []),
];
const GROUP: Record<string, string> = { QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', OT: 'OL', OG: 'OL', C: 'OL', EDGE: 'DL', DT: 'DL', LB: 'LB', CB: 'DB', S: 'DB' };
const END = new Set(['tackle', 'out_of_bounds', 'touchdown', 'sack', 'incomplete', 'interception', 'safety', 'slide']);

const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const lines: string[] = [];
const r2 = (v: number) => Math.round(v * 100) / 100;
const summary: Record<string, { n: number; caught: number; yards: number[]; ttt: number[]; killed: number; killYards: number[] }> = {};

// Each screen, then each run-pass option (a run tagged with a screen; the QB
// reads it before the snap). A thrown option is written as its screen, typed
// by the option's id; a handed-off one is summarized only.
const CALLS = [
  ...SCREEN_CONCEPTS.map(c => ({ id: c.id, concept: c, run: undefined as any, formation: FORMATION[c.id] })),
  ...RPO_CONCEPTS.map(r => ({ id: r.id, concept: SCREEN_BY_ID[r.screen], run: RUN_BY_ID[r.run], formation: r.formation })),
];
for (const call of CALLS) {
  if (ONLY.length && !ONLY.includes(call.id)) continue;
  const concept = call.concept;
  const formation = FORMATION_BY_ID[call.formation];
  for (const def of DEFENSES) for (let seed = 1; seed <= SEEDS; seed++) {
    const sim: any = new PlaySim({
      offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
      offCall: call.run
        ? { formation, flip: seed % 2 === 0, kind: 'run', run: call.run, rpo: concept, label: call.id }
        : { formation, flip: seed % 2 === 0, kind: 'pass', pass: concept, label: concept.name },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID[def.front], coverage: COVERAGE_BY_ID[def.coverage],
        pressure: def.pressure ? PRESSURE_BY_ID[def.pressure] : null, label: def.label },
      los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7, audibles: AUDIBLES,
    });
    const s = summary[`${call.id} vs ${def.label}`] ??= { n: 0, caught: 0, yards: [], ttt: [], killed: 0, killYards: [] };
    if (sim.offCall.pass?.id !== concept.id) {
      s.killed++; s.killYards.push(sim.run().yards);
      continue;
    }
    const xy: number[][] = [];
    const record = () => { const row: number[] = []; for (const a of sim.agents) row.push(r2(a.pos.x - sim.los), r2(a.pos.y)); xy.push(row); };
    const tick0 = sim.tick.bind(sim);
    record();
    sim.tick = () => { tick0(); const k = Math.round(sim.t / 0.1); if (Math.abs(sim.t - k * 0.1) < 1e-6 && k === xy.length) record(); };
    const screenBlockers = sim.offense.filter((a: any) => a.behavior?.kind === 'screen-block').map((a: any) => a.idx);
    const res = sim.run();
    const ev = sim.events as { t: number; type: string; a?: number; b?: number }[];
    const thr = ev.find(e => e.type === 'throw'), cat = ev.find(e => e.type === 'catch');
    const events: Record<string, number> = { end: r2(ev.find(e => END.has(e.type))?.t ?? sim.t) };
    if (thr) events.pass_forward = thr.t;
    if (cat) events.catch = cat.t;
    // The ball reaching the receiver's hands (CATCH_SECURE's 'secure', before the securing window ends in a catch)
    // is NFL tracking's pass_arrived; without it the operator's flight ran to possession, past the arrival.
    const arrived = ev.find(e => e.type === 'secure' && (!thr || e.t >= thr.t));
    if (arrived) events.pass_arrived = arrived.t;
    const receiverAgent = sim.agents.find((a: any) => a.slot === sim.offAlign.numbering[concept.screen!.receiver]) ?? (concept.screen!.receiver === 'B' ? sim.slot('RB') : null);
    const r = receiverAgent?.idx ?? thr?.b ?? null;
    const play = {
      id: `${call.id}|${def.label}|${seed}`, source: 'sim-screen-lab', kind: 'pass', yards: r2(res.yards),
      players: sim.agents.map((a: any) => ({ side: a.team, group: GROUP[a.player.position] ?? 'OTHER', slot: a.slot })),
      dt: 0.1, xy, ball_y: r2(sim.ballY), events, target: thr?.b ?? null, carrier: cat?.a ?? null,
      screen: { receiver: r, group: r !== null ? GROUP[sim.agents[r].player.position] : null, type: concept.id, rpo: call.run ? call.id : undefined,
        passResult: cat ? 'C' : 'I', defense: def.label, outcome: res.outcome, blockers: screenBlockers,
        penalties: sim.penalties.map((p: any) => p.kind), thrownAway: sim.agents.find((a: any) => a.slot === 'QB')?.behavior?.screenThrownAway || false, throwawayAt: ev.find(e => e.type === 'throwaway')?.t ?? null },
    };
    lines.push(JSON.stringify(play));
    s.n++; if (cat) s.caught++; s.yards.push(res.yards); if (thr) s.ttt.push(thr.t);
  }
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, gzipSync(lines.join('\n') + '\n'));
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
for (const [k, s] of Object.entries(summary)) console.log(`${k.padEnd(52)} n ${s.n} caught ${s.caught} yards p50 ${med(s.yards).toFixed(1)} mean ${(s.yards.reduce((a, b) => a + b, 0) / s.n).toFixed(1)} | throw p50 ${med(s.ttt).toFixed(2)} s${s.killed ? ` | killed ${s.killed}, check-out yards p50 ${med(s.killYards).toFixed(1)}` : ''}`);
console.log(`wrote ${lines.length} plays -> ${OUT}`);
