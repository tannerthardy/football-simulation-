/** Counterfactual entry oracle. The sim is deterministic for a fixed seed, so
 * replaying a play from the snap with an override that starts at the handoff
 * is an exact branch: everything before it is identical. Each branch forces
 * the carrier toward one lateral entry point at the line (flattening behind
 * the line first when it is far across), then the ordinary carrier takes over
 * once he is past the line. Diagnostic only: an oracle with the outcome in
 * hand, never a player's information.
 *
 * node --import tsx scripts/diag/zone-lab/oracle.ts --out out/zone-lab/oracle.jsonl.gz [lab selection args] [--shard i/n]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { BallCarrier } from '../../../src/sim/behaviors/carrier.js';
import type { PlaySim } from '../../../src/sim/playsim.js';
import { caseId, LOOK_SPECS, makeSim, rosters, type LabCase } from './lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const OFFSETS = arg('--offsets', '-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8').split(',').map(Number);

let forced: { lat: number } | null = null;
const original = BallCarrier.prototype.update;
BallCarrier.prototype.update = function (this: BallCarrier, a, sim: PlaySim) {
  const run = sim.offCall.run;
  if (!forced || !run || a !== sim.slot('RB')) return original.call(this, a, sim);
  const dir = sim.attackDir(a.team), depth = (a.pos.x - sim.los) * dir;
  if (depth > .3) { forced = null; return original.call(this, a, sim); }
  const ps = run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
  const y = sim.ballY + ps * forced.lat;
  const goal = depth < -1.2 && Math.abs(a.pos.y - y) > 1.5 ? { x: sim.los - 1.2 * dir, y } : { x: sim.los + 1.5 * dir, y };
  const dx = goal.x - a.pos.x, dy = goal.y - a.pos.y, l = Math.hypot(dx, dy) || 1;
  return { vel: { x: dx / l * a.profile.vmax, y: dy / l * a.profile.vmax }, cutSkill: 0.85 + 0.35 * a.r('elusiveness') };
};

function play(c: LabCase, R: ReturnType<typeof rosters>, lat: number | null): { gain: number; by: string | null; x: number | null } {
  const sim = makeSim(c, R);
  forced = null;
  let armed = false;
  while (sim.phase === 'live' && sim.t < 20) {
    if (!armed && lat !== null && sim.handoffAt >= 0) { armed = true; forced = { lat }; }
    sim.tick();
  }
  forced = null;
  const fc = sim.events.find((e) => e.type === 'carrier_contact');
  return { gain: Math.round(sim.buildResult().offenseYards * 100) / 100, by: fc?.b !== undefined ? sim.agents[fc.b].slot : null,
    x: sim.firstContactX === null ? null : Math.round((sim.firstContactX - sim.los) * sim.attackDir('O') * 100) / 100 };
}

const [si, sn] = arg('--shard', '0/1').split('/').map(Number);
const R = rosters();
const cases: LabCase[] = [];
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of list('--dirs', 'strong,weak') as Array<'strong' | 'weak'>) for (const lk of list('--looks', LOOK_SPECS.map(l => l[0]).join(',')))
    for (const roster of list('--rosters', 'pair11,pair31')) for (const seed of list('--seeds', '77,71001').map(Number))
      cases.push({ concept, dir, look: lk, roster, seed, formation });
const rows: string[] = [];
for (const c of cases.filter((_, i) => i % sn === si)) {
  const actual = play(c, R, null);
  const branches = OFFSETS.map((lat) => ({ lat, ...play(c, R, lat) }));
  rows.push(JSON.stringify({ id: caseId(c), ...c, actual: actual.gain, actualBy: actual.by, branches }));
}
const out = arg('--out', 'out/zone-lab/oracle.jsonl.gz');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, gzipSync(rows.join('\n') + '\n'));
console.log(`${rows.length} plays -> ${out}`);
