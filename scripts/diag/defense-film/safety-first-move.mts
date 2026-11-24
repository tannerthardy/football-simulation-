// Which behaviour sends a safety sideways first (Integration, 2026-11-24; first_move.py: our safeties' first committed
// move is lateral ~68% on every play type, NFL backward 53% on dropbacks, downhill 29% on runs). Whole games, read-only
// wrap of each safety's behavior update (its movement label, facingTechnique) and the play's state. Per safety-play: the
// coverage, his installed role (zone id / man / run fit), the play type (run / play action / dropback / screen), his
// depth and width from the ball at the snap, his first committed move (0.5 yd from his snap spot at over 1 yd/s): time,
// direction (downhill / lateral / backward, + lateral toward or away from the ball), the label then and the labels over
// his first 0.6 s, his behavior kind, and his depth and width change at 0.5 / 1.0 / 1.5 / 2.0 s.
// usage: [FLAGS] node --import tsx scripts/diag/defense-film/safety-first-move.mts --seed 101 --out rows.jsonl
import { createWriteStream } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = createWriteStream(arg('--out', 'safety.jsonl'));
const wrapped = new WeakSet<object>();
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this, oc = sim.offCall;
  const ptype = oc.kind === 'run' ? 'run' : (oc.pass?.fake || oc.pass?.family === 'playaction') ? 'play action' : oc.pass?.family === 'screen' ? 'screen' : 'dropback';
  const saf = sim.defense.filter((d: any) => ['S', 'SS', 'FS'].includes(d.player.position) || d.slot === 'SS' || d.slot === 'FS');
  const lab = new Map<any, string>(), hist = new Map<any, { t: number; x: number; y: number; lab: string; kind: string }[]>();
  const dir = sim.attackDir(sim.offense[0].team);
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    for (const d of saf) {
      const b = d.behavior;
      if (b && !wrapped.has(b)) {
        wrapped.add(b); const u = b.update.bind(b);
        b.update = (a: any, s: any) => { const c = u(a, s); lab.set(a, facingTechnique(c)?.label ?? `(${a.behavior?.kind ?? '?'})`); return c; };
      }
    }
    tick();
    if (sim.t > 2.05) return;
    for (const d of saf) {
      const h = hist.get(d) ?? []; hist.set(d, h);
      h.push({ t: sim.t, x: (d.pos.x - sim.los) * dir, y: d.pos.y, lab: lab.get(d) ?? '(none)', kind: d.behavior?.kind ?? '' });
    }
  };
  const res = orig.apply(this);
  for (const d of saf) {
    const h = hist.get(d); if (!h || h.length < 5) continue;
    const role = sim.defAlign.spots[d.slot]?.role;
    const x0 = h[0].x, y0 = h[0].y, by = sim.ballY, outSign = Math.sign(y0 - by) || 1;
    let first: any = null;
    for (let k = 2; k < h.length - 2; k++) {
      const dx = h[k].x - x0, dy = h[k].y - y0, v = Math.hypot(h[k + 2].x - h[k - 2].x, h[k + 2].y - h[k - 2].y) / Math.max(1e-6, h[k + 2].t - h[k - 2].t);
      if (Math.hypot(dx, dy) > 0.5 && v > 1) {
        const d_ = Math.abs(dy) > Math.abs(dx) ? (dy * outSign > 0 ? 'lateral-out' : 'lateral-in') : dx < 0 ? 'downhill' : 'backward';
        first = { t: +h[k].t.toFixed(2), dir: d_, label: h[k].lab, kind: h[k].kind, labels: [...new Set(h.filter((e) => e.t <= h[k].t + 1e-9 && e.t >= h[k].t - 0.6).map((e) => e.lab))] };
        break;
      }
    }
    const at = (t: number) => { const e = h.reduce((p, q) => Math.abs(q.t - t) < Math.abs(p.t - t) ? q : p); return [+(e.x - x0).toFixed(2), +((e.y - y0) * outSign).toFixed(2)]; };
    out.write(JSON.stringify({ seed, cov: sim.defCall.coverage?.id ?? null, fam: sim.defCall.coverage?.family ?? null, slot: d.slot, ptype,
      role: role ? (role.kind === 'zone' ? role.zone : role.kind) : null, depth0: +x0.toFixed(2), width0: +Math.abs(y0 - by).toFixed(2),
      first, path: { '0.5': at(0.5), '1.0': at(1.0), '1.5': at(1.5), '2.0': at(2.0) } }) + '\n');
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });
out.end(); await new Promise<void>((r) => out.on('finish', () => r()));
