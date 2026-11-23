// Every zone / match seat at the snap: his alignment, his assigned landmark (the zone the seat was built with), the lateral
// and total distance between them, and whether a teammate's landmark lies between them (he must cross a teammate's zone
// to reach his own). One row per seat per dropback; the call, the check that installed it, the structure, and whether the
// offense motioned. Read-only; Tools' game set (simulateGame(home, away, {seed})).
//   node --import tsx scripts/diag/coverage/seat-travel.mts <seed> <first> <games> [out.jsonl]
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { CoverageDefender } from '../../../src/sim/coverage/defender.js';
import { zoneLandmark, isDeepZone } from '../../../src/playbook/alignment.js';
import { formationStructure } from '../../../src/playbook/structure.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';

const seed = Number(process.argv[2] ?? 101), first = Number(process.argv[3] ?? 0), games = Number(process.argv[4] ?? 1);
const out = process.argv[5] ?? 'out/diag/coverage/seat-travel.jsonl';
mkdirSync(dirname(out), { recursive: true });
const P: any = PlaySim.prototype, tick0 = P.tick;
const r1 = (v: number) => Math.round(v * 10) / 10;
P.tick = function () {
  const res = tick0.call(this);
  if (this.__st || compilingPlan() || this.offCall?.kind !== 'pass' || this.offCall.pass?.screen || this.defCall?.coverage?.man) return res;
  if (this.t < 0) return res;
  this.__st = true;
  const dir = this.attackDir('O');
  const seats: any[] = [];
  for (const d of this.defense) {
    const b: any = d.behavior;
    const zone = b instanceof CoverageDefender ? b.zone : b?.kind === 'zone' ? b.zone : null;
    if (!zone) continue;
    let lm; try { lm = zoneLandmark(zone, this.offAlign); } catch { continue; }
    seats.push({ s: d.slot, zone, rule: b instanceof CoverageDefender ? b.rule : null, deep: isDeepZone(zone), ax: (d.pos.x - this.los) * dir, ay: d.pos.y, lx: (lm.x - this.los) * dir, ly: lm.y });
  }
  const st = formationStructure(this.offAlign);
  for (const s of seats) {
    const lat = Math.abs(s.ly - s.ay), dist = Math.hypot(s.lx - s.ax, s.ly - s.ay);
    const lo = Math.min(s.ay, s.ly), hi = Math.max(s.ay, s.ly);
    // A teammate's landmark between his alignment and his own landmark (laterally inside the span by 1+ yd, within 6 yd in
    // depth of his path) is a zone he crosses.
    const crosses = seats.filter((t) => t !== s && t.ly > lo + 1 && t.ly < hi - 1 && Math.abs(t.lx - (s.ax + (s.lx - s.ax) * ((t.ly - s.ay) / ((s.ly - s.ay) || 1)))) < 6).map((t) => `${t.s}:${t.zone}`);
    appendFileSync(out, JSON.stringify({ seed, cov: this.defCall.coverage.id, fam: this.defCall.coverage.family, check: this.defCall.check ? `${this.defCall.check.from}>${this.defCall.coverage.id} (${this.defCall.check.when})` : null,
      label: this.defCall.label, pressure: this.defCall.pressure?.id ?? null, motion: this.offCall?.motion?.kind ?? (this.offCall?.motion ? 'yes' : null), tags: st.tags, s: s.s, zone: s.zone, rule: s.rule, deep: s.deep,
      align: [r1(s.ax), r1(s.ay)], lm: [r1(s.lx), r1(s.ly)], lat: r1(lat), dist: r1(dist), crosses }) + '\n');
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let i = 0; i < games; i++) { simulateGame(home, away, { seed: seed + first + i }); console.error(`seed ${seed} game ${first + i} done`); }
