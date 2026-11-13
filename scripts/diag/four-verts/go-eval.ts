/**
 * The outside go in our QB's eyes (four-verts follow-up): on four verticals from 2x2 and 3x1 against Cover 1-4,
 * every 0.1 s from 1.8 to 3.4 s while the QB is set and before the throw, his evaluation of each outside go
 * (QBPass.evaluate, the throw he would make now) split into its terms: pAcc (his accuracy at that distance), pOpen
 * (no defender contests the catch), pClear (no hand on the ball on the way), P, the interception risk and value,
 * and his bars (the completion bar and the risk cap at that urgency), with the geometry: the receiver's depth, his
 * separation from the nearest defender, and how far ahead of that defender he is downfield (+ ahead).
 * pOpen is recovered from the value formula; pClear = P / (pAcc * hands * pOpen). Passive.
 *   [READ_PLAN=1] node --import tsx scripts/diag/four-verts/go-eval.ts [--n 40] > out/four-verts/go-eval.jsonl
 */
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { nativeTraceSetup } from '../command-trace.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const N = Number(arg('--n', '40'));
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4'])
  for (let i = 1; i <= N; i++) {
    const seed = Math.ceil(i / 2), flip = i % 2 === 0;
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation, flip }));
    const dir = sim.attackDir(sim.offense[0].team), by = sim.ballY;
    const ref = (a: any) => sim.offAlign.refOf[a.slot] ?? a.slot;
    const runners = sim.offense.filter((o: any) => o.behavior instanceof RouteRunner && ['go', 'seam'].includes(o.behavior.route?.id));
    const gos = runners.filter((r: any) => { const side = Math.sign(r.pos.y - by) || 1;
      return !runners.some((o: any) => o !== r && (Math.sign(o.pos.y - by) || 1) === side && Math.abs(o.pos.y - by) > Math.abs(r.pos.y - by) + 0.5); });
    let qb: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
      const t10 = Math.round(sim.t * 10);
      if (!qb || qb.phase !== 'set' || sim.throwAt >= 0 || Math.abs(sim.t * 10 - t10) > 1e-6 || sim.t < 1.8 || sim.t > 3.4) return;
      const a = sim.qb;
      for (const r of gos) {
        const ev = qb.ready(r, sim) ? qb.evaluate(a, sim, r, 0) : null;
        let nd = Infinity, dd: any = null;
        for (const d of sim.defense) { const x = Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y); if (x < nd) { nd = x; dd = d; } }
        const depth = (r.pos.x - sim.los) * dir, ahead = (r.pos.x - dd.pos.x) * dir;
        const row: any = { coverage, formation, seed, flip, t: +sim.t.toFixed(1), ref: ref(r), depth: +depth.toFixed(1), sep: +nd.toFixed(2), ahead: +ahead.toFixed(2), defender: dd.slot, ready: !!ev };
        if (ev) {
          const dist = Math.hypot(ev.point.x - a.pos.x, ev.point.y - a.pos.y);
          const sigma = qb.missSigma(a, sim, dist, 0), pAcc = Math.exp(-(sigma * sigma) / (2 * 1.35 * 1.35)), hands = 0.88 + 0.1 * r.r('hands');
          const sticks = ev.depth >= sim.firstDownX - sim.los ? 3 : 0;
          const pOpen = ((ev.value + (1 - ev.P) * 3 + ev.intRisk * 45) / Math.max(ev.P, 1e-6) - ev.depth - 3.5 - sticks) / 3.5;
          const aggression = 0.5 + 0.35 * (a.player.archetype === 'Gunslinger' ? 1 : 0) - 0.25 * a.r('decisionMaking');
          Object.assign(row, { airDepth: +ev.depth.toFixed(1), dist: +dist.toFixed(1), P: +ev.P.toFixed(3), pAcc: +pAcc.toFixed(3), pOpen: +pOpen.toFixed(3),
            pClear: +(ev.P / Math.max(1e-6, pAcc * hands * pOpen)).toFixed(3), intRisk: +ev.intRisk.toFixed(3), value: +ev.value.toFixed(2),
            bar: +(0.6 - 0.12 * aggression).toFixed(3), riskCap: +(0.025 + 0.05 * aggression).toFixed(3) });
        }
        process.stdout.write(JSON.stringify(row) + '\n');
      }
    };
    sim.run();
  }
