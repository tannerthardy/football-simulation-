/**
 * Corner routes from the sim, for the matched corner operator (corner.py). Restaged game plays (the same inputs
 * as scripts/diag/pass-operators/routes.ts), non-play-action; every receiver whose installed route is the corner.
 * Per 0.1 s from the snap: body position and speed, and the velocity the route controller asked for (requested vs
 * achieved). Slot = not the widest receiver on his side at the snap.
 *   node --import tsx scripts/diag/corner/sim-corners.ts > out/corner/sim.jsonl
 */
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { restoreSetup } from '../saved-play.js';

for (const seed of ['7', '11']) {
  const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any, pi: number) => {
    if (!p.pass) return;
    for (let k = 0; k < 4; k++) {
      const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
      for (let j = 0; j < k; j++) sim.rng.nextU32();
      const dice = sim.dice.bind(sim), made = new Set<string>();
      sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
      if (sim.offCall.pass?.fake) continue;
      const dir = sim.attackDir(sim.offense[0].team), los = sim.los, by = sim.ballY;
      const wr = sim.offense.filter((o: any) => o.behavior instanceof RouteRunner && ['WR', 'TE', 'RB', 'FB'].includes(o.player.position));
      const corners = wr.filter((o: any) => o.behavior.route?.id === 'corner');
      if (!corners.length) continue;
      const rec = new Map<any, any>();
      for (const o of corners) {
        const side = Math.sign(o.pos.y - by) || 1;
        const wider = wr.some((q: any) => q !== o && Math.sign(q.pos.y - by) === side && Math.abs(q.pos.y - by) > Math.abs(o.pos.y - by) + 0.5);
        const r = { seed, play: pi, k, side, slot: wider, rr: o.r('routeRunning'), vmax: o.profile.vmax, lateral: o.profile.lateral, f: [] as number[][], req: null as any };
        rec.set(o, r);
        const b = o.behavior, up = b.update.bind(b);
        b.update = (a: any, s: any) => { const c = up(a, s); r.req = c?.vel ? [c.vel.x * dir, (c.vel.y) * side] : null; return c; };
      }
      const tick = sim.tick.bind(sim); let th = -1, T: any = null;
      sim.tick = () => { const air = sim.ball.kind === 'air'; tick(); const t10 = Math.round(sim.t * 10);
        if (th < 0 && !air && sim.ball.kind === 'air') { th = t10; T = sim.ball.target; }
        if (Math.abs(sim.t * 10 - t10) < 1e-6) for (const [o, r] of rec) r.f[t10] = [(o.pos.x - los) * dir, (o.pos.y - by) * r.side, Math.hypot(o.vel.x, o.vel.y), r.req?.[0] ?? NaN, r.req?.[1] ?? NaN, o.behavior instanceof RouteRunner ? 1 : 0]; };
      sim.run();
      for (const [o, r] of rec) console.log(JSON.stringify({ ...r, req: undefined, throwF: th, targeted: o === T }));
    }
  });
}
