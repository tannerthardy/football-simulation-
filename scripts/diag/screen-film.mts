/**
 * Screen film: export screen-lab plays for a small viewer, with the ball.
 * Same matrix as screen-lab.mts (screens x calls x seeds); positions every
 * 0.1 s from the snap, x = yards past the line, rounded to 0.1 yd.
 *
 *   tsx scripts/diag/screen-film.mts [--seeds 3] [--out out/screens/film.json]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { SCREEN_CONCEPTS } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';

const arg = (name: string, d: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : d; };
const SEEDS = Number(arg('--seeds', '3'));
const OUT = arg('--out', 'out/screens/film.json');
const FORMATION: Record<string, string> = {
  rb_slip_screen: 'gun_doubles_11', te_screen: 'gun_trey_11', bubble_screen: 'gun_trips_11',
  bunch_now_screen: 'gun_bunch_11', tunnel_screen: 'gun_doubles_11',
};
const DEFENSES = [
  { label: 'Cover 3', front: 'over', coverage: 'cover3', pressure: null },
  { label: 'Cover 1', front: 'over', coverage: 'cover1', pressure: null },
  { label: 'Cover 1 Off', front: 'over', coverage: 'cover1_off', pressure: null },
  { label: 'Cover 2', front: 'over', coverage: 'cover2', pressure: null },
  { label: 'Cover 1 Mike A', front: 'over', coverage: 'cover1', pressure: 'mike_a' },
];
const r1 = (v: number) => Math.round(v * 10) / 10;
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const plays: unknown[] = [];
for (const concept of SCREEN_CONCEPTS) {
  const formation = FORMATION_BY_ID[FORMATION[concept.id]];
  for (const def of DEFENSES) for (let seed = 1; seed <= SEEDS; seed++) {
    const sim: any = new PlaySim({
      offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: concept, label: concept.name },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID[def.front], coverage: COVERAGE_BY_ID[def.coverage],
        pressure: def.pressure ? PRESSURE_BY_ID[def.pressure] : null, label: def.label },
      los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7,
    });
    const frames: number[][] = [];
    const blockers = new Set<number>();
    const record = () => {
      const row: number[] = [];
      for (const a of sim.agents) {
        row.push(r1(a.pos.x - sim.los), r1(a.pos.y));
        if (a.behavior?.kind === 'screen-block') blockers.add(a.idx);
      }
      const b = sim.ballPos ? sim.ballPos() : null;
      const c = sim.carrier;
      const bp = b ?? (c ? { x: c.pos.x, y: c.pos.y, z: 1 } : { x: sim.los, y: sim.ballY, z: 0 });
      row.push(r1(bp.x - sim.los), r1(bp.y), r1(bp.z ?? 0), c ? c.idx : -1);
      frames.push(row);
    };
    const tick0 = sim.tick.bind(sim);
    record();
    sim.tick = () => { tick0(); const k = Math.round(sim.t / 0.1); if (Math.abs(sim.t - k * 0.1) < 1e-6 && k === frames.length) record(); };
    const res = sim.run();
    const receiver = sim.agents.find((a: any) => a.slot === sim.offAlign.numbering[concept.screen!.receiver]) ?? (concept.screen!.receiver === 'B' ? sim.slot('RB') : null);
    const events = (sim.events as any[]).filter(e => ['throw', 'catch', 'tackle', 'incomplete', 'interception', 'out_of_bounds', 'touchdown', 'sack', 'pbu', 'drop'].includes(e.type))
      .map(e => ({ t: e.t, type: e.type, a: e.a ?? null }));
    plays.push({
      screen: concept.name, screenId: concept.id, defense: def.label, seed, yards: r1(res.yards), outcome: res.outcome,
      players: sim.agents.map((a: any) => ({ team: a.team, slot: a.slot, pos: a.player.position })),
      receiver: receiver?.idx ?? null, blockers: [...blockers], events, frames,
    });
  }
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ los: 35, plays }));
console.log(`wrote ${plays.length} plays -> ${OUT}`);
