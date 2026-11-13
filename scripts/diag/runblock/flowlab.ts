/** Lateral flow lab: the same bodies, calls and seeds per rep (observation
 * only; flags from the environment). For each run concept, at 0.5 / 1.0 /
 * 1.5 s: the offensive line's and the down linemen's lateral velocity toward
 * the play side requested (intent) and achieved, split by engaged or free;
 * the backers' (LB slots) the same plus their lateral travel since the snap;
 * and the back's. Line flow |dy| of the five OL at 1.5 s, as line-flow.py.
 * Play side: the concept's direction.
 * node --import tsx scripts/diag/runblock/flowlab.ts [--reps 4] [--seed 7] [--concepts iz_strong,oz_strong,duo,power,counter] */
import { CENTER_Y, HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const reps = Number(arg('--reps', '4')), seed = Number(arg('--seed', '7'));
const concepts = arg('--concepts', 'iz_strong,oz_strong,duo,power,counter').split(',');
const rng = new Rng(seed);
const home = generateTeam(rng.fork('offense'), 'Offense', 'OFF', { strength: 0.55 });
const away = generateTeam(rng.fork('defense'), 'Defense', 'DEF', { strength: 0.55 });
const T = [0.5, 1.0, 1.5];
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
type Acc = Record<string, number[]>;
const acc = new Map<string, Acc>();
const add = (concept: string, key: string, v: number) => {
  const a = acc.get(concept) ?? acc.set(concept, {}).get(concept)!;
  (a[key] ??= []).push(v);
};
for (const form of ['ace_11', 'i_pro_21', 'gun_doubles_11']) {
  const formation = FORMATION_BY_ID[form];
  const personnel = formation.personnel === '11' ? 'nickel' : 'base43';
  for (const concept of concepts) for (const front of ['over', 'under']) for (const flip of [false, true])
    for (const ballY of [CENTER_Y, HASH_LEFT_Y]) for (let i = 0; i < reps; i++) {
      const cell = `${form}:${concept}:${front}:${flip}:${ballY}`;
      const sim = new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, personnel),
        offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[concept], label: concept },
        defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
        los: 40, ballY, firstDownX: 50, seed: rng.fork(`${cell}:${i}`) });
      const ps = playSideSign(sim, RUN_BY_ID[concept]);
      const y0 = new Map<Agent, number>(sim.agents.map(a => [a, a.pos.y]));
      let next = 0;
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        if (next >= T.length || sim.t < T[next] - 1e-9) return;
        const t = T[next++];
        const ol = sim.offense.filter(a => OL.has(a.slot));
        for (const a of ol) {
          const tag = a.engagement || sim.defense.some(d => d.engagement?.blocker === a) ? 'eng' : 'free';
          add(concept, `OL req ${t} ${tag}`, (sim.intents[a.idx]?.vel.y ?? 0) * ps);
          add(concept, `OL got ${t} ${tag}`, a.vel.y * ps);
        }
        if (t === 1.5) add(concept, 'OL flow 1.5', Math.abs(ol.reduce((s, a) => s + a.pos.y - y0.get(a)!, 0) / ol.length));
        for (const d of sim.defense.filter(d => /^(DE|DT|NT)/.test(d.slot))) {
          const tag = d.engagement ? 'eng' : 'free';
          add(concept, `DL req ${t} ${tag}`, (sim.intents[d.idx]?.vel.y ?? 0) * ps);
          add(concept, `DL got ${t} ${tag}`, d.vel.y * ps);
        }
        for (const d of sim.defense.filter(d => d.slot.startsWith('LB'))) {
          add(concept, `LB req ${t}`, (sim.intents[d.idx]?.vel.y ?? 0) * ps);
          add(concept, `LB got ${t}`, d.vel.y * ps);
          add(concept, `LB moved ${t}`, (d.pos.y - y0.get(d)!) * ps);
        }
        const rb = sim.slot('RB');
        if (rb) { add(concept, `RB got ${t}`, rb.vel.y * ps); }
      };
      sim.run();
      for (const d of sim.defense.filter(d => d.slot.startsWith('LB'))) {
        add(concept, 'LB run read at', d.recog?.read === 'run' ? d.recog.readAt : NaN);
        add(concept, 'LB read run share', d.recog?.read === 'run' ? 1 : 0);
      }
      add(concept, 'handoff at', sim.handoffAt);
    }
}
const q = (v: number[] | undefined) => { if (!v?.length) return '   -  '; const w = [...v].sort((a, b) => a - b); return w[Math.floor(w.length / 2)].toFixed(2).padStart(6); };
const mean = (v: number[] | undefined) => v?.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2).padStart(6) : '   -  ';
for (const [concept, a] of acc) {
  console.log(`== ${concept} (lateral toward the play side, yd/s; medians, means for engaged OL/DL)`);
  for (const t of T) {
    console.log(`  ${t}s OL eng req/got ${mean(a[`OL req ${t} eng`])}/${mean(a[`OL got ${t} eng`])} free ${q(a[`OL req ${t} free`])}/${q(a[`OL got ${t} free`])}`
      + ` | DL eng ${mean(a[`DL req ${t} eng`])}/${mean(a[`DL got ${t} eng`])} free ${q(a[`DL req ${t} free`])}/${q(a[`DL got ${t} free`])}`
      + ` | LB ${q(a[`LB req ${t}`])}/${q(a[`LB got ${t}`])} moved ${q(a[`LB moved ${t}`])} | RB ${q(a[`RB got ${t}`])}`);
  }
  console.log(`  OL line flow |dy| at 1.5 s ${q(a['OL flow 1.5'])} | LB run read at p50 ${q(a['LB run read at']?.filter(Number.isFinite))} s (read run ${mean(a['LB read run share'])}) | handoff ${q(a['handoff at'])} s`);
}
