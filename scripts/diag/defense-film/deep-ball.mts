// Deep-ball outcomes for the deep safety's read (Integration, 2026-11-24, DEPTH_FIRST): every targeted throw of a
// whole game with its route (the target's route id and family), the call's coverage family and the shell it implies
// (single-high: cover1 / cover3 families; two-high: cover2 / cover4 / cover6 / tampa2; none: cover0), the intended air
// yards, completion, interception and yards gained; and the look-off: the passer's eyes (sim.qbEyes) held 0.3 s+ on a
// different receiver in the 0.8 s before the throw, plus each deep safety's (snap depth 9+ yd) lateral distance toward the
// target at the throw against where he was at the snap. Read-only wrap of throwBall and run.
// usage: [FLAGS] node --import tsx scripts/diag/defense-film/deep-ball.mts --seed 101 --out rows.jsonl
import { createWriteStream } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = createWriteStream(arg('--out', 'deep.jsonl'));
const SINGLE = new Set(['cover1', 'cover3']), TWO = new Set(['cover2', 'cover4', 'cover6', 'tampa2']);
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this; let rec: any = null; const eyes: { t: number; e: any }[] = [];
  const tick = sim.tick.bind(sim); sim.tick = () => { tick(); if (!rec) eyes.push({ t: sim.t, e: sim.qbEyes ?? null }); };
  let snap: Map<any, any> | null = null;
  const dir = () => sim.attackDir(sim.offense[0].team);
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (qb: any, target: any, ...rest: any[]) => {
    const throwaway = rest[3] === true;
    if (target && !throwaway && !rec) {
      const off = eyes.filter((e) => e.t >= sim.t - 0.8 && e.e && e.e !== target).length * sim.dt;
      const deep = sim.defense.filter((d: any) => (snap?.get(d)?.x ?? 0) >= 9);
      const toward = deep.map((d: any) => { const y0 = snap!.get(d).y, s0 = Math.sign(target.pos.y - y0) || 1; return +((d.pos.y - y0) * s0).toFixed(2); });
      rec = { lookoff: off >= 0.3, toward, t: +sim.t.toFixed(2), route: target.behavior?.route?.id ?? null, rfam: target.behavior?.route?.family ?? null };
    }
    return tb(qb, target, ...rest);
  };
  const t2 = sim.tick; sim.tick = () => { if (!snap) snap = new Map(sim.defense.map((d: any) => [d, { x: (d.pos.x - sim.los) * dir(), y: d.pos.y }])); t2(); };
  const res = orig.apply(this);
  if (rec) {
    const fam = sim.defCall.coverage?.family ?? null, s = res.stats ?? sim.stats;
    out.write(JSON.stringify({ seed, ...rec, cov: sim.defCall.coverage?.id ?? null, fam, shell: SINGLE.has(fam) ? 'single-high' : TWO.has(fam) ? 'two-high' : 'none',
      air: s.airYards ?? null, completed: !!s.completed, int: !!s.interceptedBy, gained: s.completed ? (s.completedAirYards ?? null) : null, yards: res.yards ?? null, yac: s.yac ?? null }) + '\n');
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });
out.end(); await new Promise<void>((r) => out.on('finish', () => r()));
