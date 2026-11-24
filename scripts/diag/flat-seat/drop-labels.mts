// Which movement branch carries an underneath dropper deep (Flex, 2026-11-24, ZONE_PACE was neutral). Whole games, a
// read-only wrap of each defender's behavior update: per tick, for defenders installed in a hook / hole / curl /
// curl-flat zone on non-PA dropbacks before the throw, the movement label of the command (facingTechnique) and his
// depth speed. Output: per 0.5 s bucket, label shares and the mean depth speed under each label.
// usage: [FLAGS] node --import tsx scripts/diag/flat-seat/drop-labels.mts --seed 101 --out rows.json
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = arg('--out', 'labels.json');
const agg: Record<string, Record<string, [number, number]>> = {};
const wrapped = new WeakSet<object>();
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this, oc = sim.offCall;
  if (oc.kind !== 'pass' || oc.pass?.family === 'screen' || oc.pass?.fake || oc.pass?.family === 'playaction') return orig.apply(this);
  const seats = new Set<any>();
  for (const d of sim.defense) {
    const role = sim.defAlign.spots[d.slot]?.role, z = role?.kind === 'zone' ? role.zone : '';
    if (z.startsWith('hook') || z === 'hole' || z === 'hook_mid' || z.startsWith('curl')) seats.add(d);
  }
  const last = new Map<any, string>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    for (const d of seats) {
      const b = d.behavior;
      if (b && !wrapped.has(b)) {
        wrapped.add(b); const u = b.update.bind(b);
        b.update = (a: any, s: any) => { const c = u(a, s); last.set(a, facingTechnique(c)?.label ?? `(${a.behavior?.kind ?? '?'})`); return c; };
      }
    }
    const x0 = new Map<any, number>(); for (const d of seats) x0.set(d, d.pos.x);
    tick();
    if (sim.ball.kind === 'air' || sim.t > 3.0) return;
    const bucket = (Math.floor(sim.t / 0.5) * 0.5).toFixed(1);
    for (const d of seats) {
      const lab = last.get(d) ?? '(none)', v = (d.pos.x - x0.get(d)!) / sim.dt;
      const B = (agg[bucket] ??= {}); const e = (B[lab] ??= [0, 0]); e[0]++; e[1] += v;
    }
  };
  return orig.apply(this);
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });
writeFileSync(out, JSON.stringify(agg));
