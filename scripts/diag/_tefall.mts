/** One snap: trace the offending TE/H and the falling backer 1.0-2.1 s (contact, engagement, support state, speeds). usage: <seed> <defSlot> <offSlot> */
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickOffense, pickDefense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
const [seedArg, ds, os] = process.argv.slice(2);
const row = readFileSync('scripts/diag/_cfit.mts', 'utf8').split('\n').map((l) => l.trim().split(/\s+/)).find((r) => r[6] === seedArg)!;
const [cov, form, run, front, flip, team, seed, los, ballY] = row;
const i = Number(team) + 1;
const o = generateTeam(new Rng(100 + i), 'O', 'O', { strength: .55 }), d = generateTeam(new Rng(200 + i), 'D', 'D', { strength: .55 });
const formation = FORMATION_BY_ID[form]; const pers: any = /12|21/.test(formation.personnel) ? 'base43' : 'nickel';
const sim: any = new PlaySim({ offense: pickOffense(o, formation.personnel as any), defense: pickDefense(d, pers),
  offCall: { formation, flip: flip === 'true', kind: 'run', run: RUN_BY_ID[run], label: run } as any,
  defCall: { personnel: pers, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov } as any,
  los: Number(los), ballY: Number(ballY), firstDownX: 55, seed: Number(seed), audibles: false } as any);
const D = sim.defense.find((a: any) => a.slot === ds), O = sim.offense.find((a: any) => a.slot === os);
console.log(`${D.slot} ${D.player.position} mass ${D.player.mass ?? D.body.mass} | ${O.slot} ${O.player.position} mass ${O.player.mass ?? O.body.mass} | O behavior ${O.behavior?.kind}`);
while (sim.t < 2.1) { sim.tick(); if (sim.t < 1.0) continue;
  const c = (sim.lastStep?.contacts ?? []).find((k: any) => (k.i === D.idx && k.j === O.idx) || (k.j === D.idx && k.i === O.idx));
  const eO = sim.engagements.find((e: any) => e.blocker === O), eD = sim.engagements.find((e: any) => e.defender === D);
  console.log(`${sim.t.toFixed(2)} gap=${Math.hypot(D.pos.x - O.pos.x, D.pos.y - O.pos.y).toFixed(2)} D v=(${D.vel.x.toFixed(1)},${D.vel.y.toFixed(1)}) sup=${D.body.support?.state} O v=(${O.vel.x.toFixed(1)},${O.vel.y.toFixed(1)}) Obeh=${O.behavior?.kind} Oeng=${eO ? eO.defender.slot + ':' + eO.type : '-'} Deng=${eD ? eD.blocker.slot : '-'} contact=${c ? JSON.stringify(Object.fromEntries(Object.entries(c).filter(([k]) => !['i', 'j'].includes(k)).map(([k, v]: any) => [k, typeof v === 'number' ? +v.toFixed(2) : typeof v === 'object' ? '[o]' : v]))) : '-'}`); }
