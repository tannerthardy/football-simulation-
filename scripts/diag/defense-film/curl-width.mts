// Where the curl-flat dropper's width comes from (Coverage, 2026-11-24: ours stand ~3 yd narrower than the NFL's CFL/CFR at
// 2.5-3.5 s in every arm). Whole games, dropbacks without play action, the ball not yet thrown. For each curl_flat zone
// defender at 2.5 / 3.0 / 3.5 s: his width from the ball, his landmark's width (the behavior's recorded landmark), the
// movement label his behavior returned (facingTechnique), and the width of the receiver he targets, if any.
// usage: [FLAGS] node --import tsx scripts/diag/defense-film/curl-width.mts --seed 101 --out rows.jsonl
import { createWriteStream } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = createWriteStream(arg('--out', 'curl.jsonl'));
const wrapped = new WeakSet<object>();
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this, oc = sim.offCall;
  if (oc?.kind !== 'pass' || oc.pass?.fake || oc.pass?.family === 'playaction' || oc.pass?.family === 'screen') return orig.apply(this);
  const lab = new Map<any, string>(); const want = [2.5, 3.0, 3.5]; let thrown = false;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    for (const d of sim.defense) { const b = d.behavior; if (b && !wrapped.has(b)) { wrapped.add(b); const u = b.update.bind(b); b.update = (a: any, s: any) => { const c = u(a, s); lab.set(a, facingTechnique(c)?.label ?? `(${a.behavior?.kind ?? '?'})`); return c; }; } }
    tick();
    if (sim.ball?.kind === 'air' || sim.events?.some((e: any) => e.type === 'throw')) thrown = true;
    const t = sim.t, w = want.find((x) => Math.abs(t - x) < 0.026);
    if (w === undefined || thrown) return;
    for (const d of sim.defense) {
      const role = sim.defAlign.spots[d.slot]?.role;
      if (!(role?.kind === 'zone' && String(role.zone).startsWith('curl_flat'))) continue;
      const b: any = d.behavior; let lm: any = null; try { lm = b?.recordedLandmark?.(); } catch { lm = null; }
      const tgt = b?.target ?? null;
      out.write(JSON.stringify({ seed, cov: sim.defCall.coverage.id, fam: sim.defCall.coverage.family, t: w, slot: d.slot, kind: b?.kind ?? null, label: lab.get(d) ?? null,
        w: +Math.abs(d.pos.y - sim.ballY).toFixed(2), lmw: lm ? +Math.abs(lm.y - sim.ballY).toFixed(2) : null, depth: +(d.pos.x - sim.los).toFixed(2),
        tw: tgt ? +Math.abs(tgt.pos.y - sim.ballY).toFixed(2) : null, side: Math.sign(d.pos.y - sim.ballY) === Math.sign((lm?.y ?? d.pos.y) - sim.ballY) }) + '\n');
    }
  };
  return orig.apply(this);
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });
out.end(); await new Promise<void>((r) => out.on('finish', () => r()));
