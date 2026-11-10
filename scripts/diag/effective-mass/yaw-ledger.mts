// Where a holder's turn comes from (Defense's HOLD_FACING trace, 2026-11-10). Needs the temporary DIAG_YAW ledger in
// world.ts (diag_yaw.patch; per-body spin changes by source and partner). Fixed run set. Each tackler's first 0.5 s in the
// tackle bond, classified at its start by where he is relative to the runner's travel (front cos > 0.5, behind
// cos < -0.5, else side). His facing change over the window is split by source: the spin each source adds, integrated
// over the rest of the window, plus the spin he brought in. Sources: feet (gait turn; includes passive, which is also
// shown alone), grasps, hands, strikes, support (held legs), contactN / contactT (torso contact lever arms / friction),
// wrap; each split by partner (the runner or a third body). Medians of |total| and mean signed shares along each
// holder's own net turn. usage: DIAG_YAW=1 [flags] node --import tsx scripts/diag/effective-mass/yaw-ledger.mts [dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const DIR = process.argv[2] ?? 'out/matched-restage';
const SEEDS = (process.env.SEEDS ?? '7,9,11,13,15,17,19,21,23,25,27,29').split(',').map(Number);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
for (const seed of SEEDS) for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (p.pass) continue;
  const sim: any = new PlaySim(st); const H = new Map<any, any>(); const tick = sim.tick.bind(sim);
  sim.tick = () => {
    for (const a of sim.agents) delete a.body.__yaw;
    const t0 = sim.t; tick(); const dt = sim.t - t0; const b = sim.bond; if (!b) return;
    const c = b.carrier, ci = sim.world.indexOf(c.body);
    for (const d of b.tacklers) {
      let h = H.get(d);
      if (!h) { const cs = Math.hypot(c.vel.x, c.vel.y) || 1, rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rr = Math.hypot(rx, ry) || 1;
        const cos = (c.vel.x * rx + c.vel.y * ry) / (cs * rr);
        const jt = sim.world.joints.find((j: any) => j.kind === 'grasp' && j.a === d.body && j.b === c.body);
        h = { legs: jt ? +(jt.legs ?? 0).toFixed(2) : null, where: cos > 0.5 ? 'front' : cos < -0.5 ? 'behind' : 'side', f0: d.body.facing, prev: d.body.facing, turn: 0, s0: d.body.spin ?? 0, t: 0, src: {} as any, cum: {} as any, off: 0, done: false };
        H.set(d, h); }
      if (h.done) continue;
      const y = d.body.__yaw ?? {};
      for (const [k, v] of Object.entries(y)) { const [src, j] = k.split(':'); const key = `${src}:${Number(j) === ci ? 'runner' : Number(j) < 0 ? 'self' : 'third'}`; h.cum[key] = (h.cum[key] ?? 0) + (v as number); }
      for (const [k, v] of Object.entries(h.cum)) h.src[k] = (h.src[k] ?? 0) + (v as number) * dt; // spin added so far, held over this tick
      h.turn += wrap(d.body.facing - h.prev); h.prev = d.body.facing; h.t += dt; if (d.body.support?.state !== 'up') h.off += dt;
      if (h.t >= 0.5 - 1e-9) { h.done = true; h.s0turn = h.s0 * h.t;
        console.log(JSON.stringify({ legs: h.legs, where: h.where, turn: +(h.turn * 57.3).toFixed(1), spinIn: +(h.s0turn * 57.3).toFixed(1), off: +h.off.toFixed(2),
          src: Object.fromEntries(Object.entries(h.src).map(([k, v]) => [k, +((v as number) * 57.3).toFixed(1)])) })); }
    } };
  sim.run();
}
