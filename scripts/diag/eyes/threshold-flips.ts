// node --import tsx scripts/diag/eyes/threshold-flips.ts [seed] [games] > rows.jsonl
// Tools' margin-less threshold census (2026-11-16), the QB lane's two sites: how often each flips, and flips back
// inside 0.3 s, per pass play while he holds the ball in the pass behavior.
//  - QBPass.felt: each defender's bearing against 1.8 rad of his facing (behind his shoulder: the non-visual feel,
//    with a delay by pocket presence; in front: the tracking channel). Recomputed here from the plain picture he
//    stored this tick (QB_TICK_PICTURE's store), with the same formula: no extra perception call.
//  - QBMind.observe: each defender in his clear-look sector or not (the sector's edge, by focus). Read passively: a
//    defender is in the clear sector this tick when his memory entry's stamp moved since the last tick.
// One row per play: per site, the defender-ticks counted, the flips, and the flips undone within 0.3 s, plus the
// decisions that read the site within 0.3 s of a flip are not attributed here (Tools' dither panel does that).
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const BACK = 0.3;
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const tick = sim.tick.bind(sim);
  let qb: any = null;
  const lastT = new Map<any, number>(), prevFelt = new Map<any, any>();
  const jumps = { flip: [] as number[], steady: [] as number[], flipDist: [] as number[] };
  const hist = { felt: new Map<any, [number, boolean][]>(), sector: new Map<any, [number, boolean][]>() };
  sim.tick = () => {
    tick();
    const b: any = sim.qb.behavior;
    if (b?.kind !== 'qb-pass' || sim.carrier !== sim.qb) return;
    if (!qb) qb = b;
    if (b !== qb || !b.pics?.size) return;
    const a = sim.qb;
    for (const d of sim.defense) {
      const p = b.pics.get(d)?.plain;
      if (p) {
        const raw = Math.atan2(p.pos.y - a.pos.y, p.pos.x - a.pos.x) - a.body.facing;
        // With QB_FELT_EDGE, his held state (enter and exit); else the single edge, recomputed.
        const held = b.behind?.get(d);
        const blind = held !== undefined ? held : Math.abs(Math.atan2(Math.sin(raw), Math.cos(raw))) > 1.8;
        const h = hist.felt.get(d) ?? [];
        // The felt picture's jump this tick beyond where last tick's felt picture carried him: at a flip this is how far
        // apart the two channels' pictures of the same rusher are.
        const f = b.pics.get(d)?.felt, pf = prevFelt.get(d);
        if (f && pf) {
          const jump = Math.hypot(f.pos.x - (pf.pos.x + pf.vel.x * sim.dt), f.pos.y - (pf.pos.y + pf.vel.y * sim.dt));
          const flip = h.length > 0 && h[h.length - 1][1] !== blind;
          (flip ? jumps.flip : jumps.steady).push(jump);
          if (flip) jumps.flipDist.push(Math.hypot(p.pos.x - a.pos.x, p.pos.y - a.pos.y));
        }
        if (f) prevFelt.set(d, { pos: { ...f.pos }, vel: { ...f.vel } });
        h.push([sim.t, blind, a.body.facing] as any); hist.felt.set(d, h);
      }
      const m = b.mind?.memory?.get(d);
      // observe stamps the memory before the tick's clock advances: in the sector this tick = the stamp moved.
      const inSector = !!m && m.t !== lastT.get(d); if (m) lastT.set(d, m.t);
      const h2 = hist.sector.get(d) ?? []; h2.push([sim.t, inSector]); hist.sector.set(d, h2);
    }
  };
  const res = orig.apply(this);
  if (qb) {
    const out: any = { concept: sim.offCall?.pass?.id ?? '?', jumps: { flip: jumps.flip.map((x) => +x.toFixed(2)), flipDist: jumps.flipDist.map((x) => +x.toFixed(1)), steadyN: jumps.steady.length, steadyP50: jumps.steady.length ? +jumps.steady.sort((x, y) => x - y)[jumps.steady.length >> 1].toFixed(3) : null, steadyP90: jumps.steady.length ? +jumps.steady[Math.floor(jumps.steady.length * 0.9)].toFixed(3) : null } };
    for (const site of ['felt', 'sector'] as const) {
      let ticks = 0, flips = 0, back = 0, secs = 0; const turns: number[] = [];
      for (const h of hist[site].values()) {
        ticks += h.length; if (h.length) secs += h[h.length - 1][0] - h[0][0];
        const f: number[] = [];
        for (let i = 1; i < h.length; i++) if (h[i][1] !== h[i - 1][1]) f.push(h[i][0]);
        flips += f.length;
        for (let i = 1; i < f.length; i++) if (f[i] - f[i - 1] <= BACK + 1e-9) back++;
        // For the felt site: how far his facing turned between a flip and its undoing (rad), for flips undone in 0.3 s.
        if (site === 'felt') {
          const fi: number[] = [];
          for (let i = 1; i < h.length; i++) if (h[i][1] !== h[i - 1][1]) fi.push(i);
          for (let j = 1; j < fi.length; j++) if (h[fi[j]][0] - h[fi[j - 1]][0] <= BACK + 1e-9) {
            let lo = Infinity, hi = -Infinity;
            for (let k = fi[j - 1] - 1; k <= fi[j]; k++) { const v = (h[k] as any)[2]; lo = Math.min(lo, v); hi = Math.max(hi, v); }
            turns.push(+(hi - lo).toFixed(3));
          }
        }
      }
      out[site] = { ticks, flips, back, defSecs: +secs.toFixed(2), turns };
    }
    console.log(JSON.stringify(out));
  }
  return res;
};
const seed = Number(process.argv[2] ?? 11);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 2); g++) simulateGame(home, away, { seed: seed + g });
