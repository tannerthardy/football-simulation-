// The deep safety's retreat pace (Integration / Coverage, 2026-11-24: our deep half gains +0.7-0.9 yd of depth by 1.0 s
// against the NFL's +1.3, and his first move is lateral 66% against 24%). Is the slow start the request (the controller
// asks for little depth) or the body (it asks, he cannot)? Whole games, read-only wrap of each deep safety's behavior
// update. For deep_half / deep_mid / quarter / deep_third safeties (snap depth 9+), on dropbacks (no PA), at 0.25 ... 1.5 s:
// requested depth speed (the command's vel.x, toward his goal line), achieved depth speed, his speed overall, the
// movement label, and the requested lateral speed.
// usage: [FLAGS] node --import tsx scripts/diag/defense-film/retreat-pace.mts --seed 101 --out rows.jsonl
import { createWriteStream } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = createWriteStream(arg('--out', 'retreat.jsonl'));
const wrapped = new WeakSet<object>();
const TS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this, oc = sim.offCall;
  if (oc?.kind !== 'pass' || oc.pass?.fake || oc.pass?.family === 'playaction' || oc.pass?.family === 'screen') return orig.apply(this);
  const dir = sim.attackDir(sim.offense[0].team);
  const cmdOf = new Map<any, any>(), lab = new Map<any, string>();
  const saf = sim.defense.filter((d: any) => { const r = sim.defAlign.spots[d.slot]?.role; return r?.kind === 'zone' && /^(deep_|quarter_)/.test(String(r.zone)); });
  const snap = new Map<any, number>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    for (const d of saf) {
      if (!snap.has(d)) snap.set(d, (d.pos.x - sim.los) * dir);
      const b = d.behavior; if (b && !wrapped.has(b)) { wrapped.add(b); const u = b.update.bind(b); b.update = (a: any, s: any) => { const c = u(a, s); cmdOf.set(a, c); lab.set(a, facingTechnique(c)?.label ?? `(${a.behavior?.kind ?? '?'})`); return c; }; }
    }
    tick();
    const w = TS.find((x) => Math.abs(sim.t - x) < 0.026);
    if (w === undefined) return;
    for (const d of saf) {
      if ((snap.get(d) ?? 0) < 9) continue;
      const c = cmdOf.get(d); const r = sim.defAlign.spots[d.slot]?.role;
      out.write(JSON.stringify({ seed, t: w, zone: r?.zone, cov: sim.defCall.coverage.family, label: lab.get(d) ?? null,
        reqX: c?.vel ? +(c.vel.x * dir).toFixed(2) : null, reqY: c?.vel ? +Math.abs(c.vel.y).toFixed(2) : null,
        actX: +(d.vel.x * dir).toFixed(2), actY: +Math.abs(d.vel.y).toFixed(2), speed: +Math.hypot(d.vel.x, d.vel.y).toFixed(2),
        gain: +((d.pos.x - sim.los) * dir - (snap.get(d) ?? 0)).toFixed(2), vmax: +(d.profile.vmax * d.speedScale).toFixed(2), bp: d.profile.backpedal ?? null }) + '\n');
    }
  };
  return orig.apply(this);
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });
out.end(); await new Promise<void>((r) => out.on('finish', () => r()));
