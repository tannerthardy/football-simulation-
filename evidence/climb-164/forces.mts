// #164: force budget on climbers in contact with the released DL, first 0.5 s after release.
// Per tick, along the climber's request direction u and along the climber->DL normal n:
// achieved accel (dv/dt), leg/ground accel, contact normal accel (from the record), and the
// residual (contact friction + anything else) = achieved - ground - normal. argv: worktree seeds(comma)
import { readFileSync } from 'node:fs';
const W = process.argv[2], seeds = process.argv[3].split(',');
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT', 'Y', 'H', 'F']);
const acc: Record<string, number[]> = {};
const push = (k: string, v: number) => (acc[k] ??= []).push(v);
let releases = 0, contactTicks = 0;
for (const seed of seeds) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const snap of snaps) {
    const setup = restoreSetup(Buffer.from(snap.setup, 'base64'));
    if (!setup.offCall?.run) continue;
    const sim: any = new PlaySim(setup), ags: any[] = sim.agents;
    const prev = new Map<any, string>(), live: Array<{ a: any; dl: any; t: number }> = [];
    const step = sim.world.step.bind(sim.world);
    sim.world.step = (intents: any[], dt: number) => {
      const before = live.filter(r => sim.t - r.t <= 0.5).map(r => ({ r, v: { ...r.a.vel }, req: intents[ags.indexOf(r.a)]?.vel }));
      const rep = step(intents, dt);
      for (const { r, v, req } of before) {
        const i = ags.indexOf(r.a), d = ags.indexOf(r.dl), m = sim.world.mass[i];
        const c = rep.contacts.filter((x: any) => (x.i === i && x.j === d) || (x.i === d && x.j === i));
        const N = c.reduce((s: number, x: any) => s + x.impulse, 0);
        if (N < 1e-6 || !req) continue;
        contactTicks++;
        const nx0 = r.dl.pos.x - r.a.pos.x, ny0 = r.dl.pos.y - r.a.pos.y, L = Math.hypot(nx0, ny0), nx = nx0 / L, ny = ny0 / L;
        const rl = Math.hypot(req.x, req.y); if (rl < 1) continue;
        const ux = req.x / rl, uy = req.y / rl, tx = -ny, ty = nx; // u: request, n: toward DL, t: tangent
        const a = { x: (r.a.vel.x - v.x) / dt, y: (r.a.vel.y - v.y) / dt };
        const g = { x: rep.groundImpulse[i].x / dt / m, y: rep.groundImpulse[i].y / dt / m };
        const cn = { x: -nx * N / dt / m, y: -ny * N / dt / m }; // normal pushes him away from the DL
        const res = { x: a.x - g.x - cn.x, y: a.y - g.y - cn.y };
        const dot = (p: any, qx: number, qy: number) => p.x * qx + p.y * qy;
        push('achieved·u', dot(a, ux, uy)); push('ground·u', dot(g, ux, uy)); push('normal·u', dot(cn, ux, uy)); push('residual·u', dot(res, ux, uy));
        push('|normal|', N / dt / m); push('|residual tangential|', Math.abs(dot(res, tx, ty))); push('residual·n', dot(res, nx, ny));
        push('req·n (cos)', ux * nx + uy * ny);
        const dI = intents[d]; push('DL req toward climber', dI ? -(dI.vel.x * nx + dI.vel.y * ny) : 0);
      }
      return rep;
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      for (const a of sim.offense) {
        if (!OL.has(a.slot)) continue;
        const tgt = a.behavior?.plan?.target, p = prev.get(a), slot = tgt?.slot ?? '-';
        if (p && /^(DT|DE|NT)/.test(p) && slot.startsWith('LB') && sim.t < 2.5) { const dl = sim.defense.find((x: any) => x.slot === p); if (dl) { live.push({ a, dl, t: sim.t }); releases++; } }
        prev.set(a, slot);
      }
    };
    sim.run();
  }
}
const q = (xs: number[], p: number) => { const s = [...xs].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
console.log(`releases ${releases}, contact ticks ${contactTicks} (yd/s², mean / p25 / p50 / p75)`);
for (const [k, xs] of Object.entries(acc)) console.log(k.padEnd(24), [mean(xs), q(xs, .25), q(xs, .5), q(xs, .75)].map(v => v.toFixed(2)).join(' / '));
