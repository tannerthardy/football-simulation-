import { PlaySim } from '../wt947/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt947/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt947/scripts/diag/command-trace.js';
const TAUGHT: any = { slant_flat: { back: 'check' }, quick_outs: { back: 'back_flat' } };
const acc: Record<string, number[][]> = {};
for (const [con, cov, form] of [['quick_outs', 'cover3', 'gun_doubles_11'], ['quick_outs', 'cover2', 'gun_doubles_11'], ['slant_flat', 'cover1', 'gun_doubles_11'], ['slant_flat', 'cover3', 'gun_doubles_11'], ['stick', 'cover3', 'gun_trips_11']]) {
  for (let seed = 1; seed <= 15; seed++) {
    const setup: any = nativeTraceSetup({ concept: con, coverage: cov, seed, roster: 3, formation: form, flip: false });
    if (TAUGHT[con]) setup.offCall.pass = { ...PASS_BY_ID[con], ...TAUGHT[con] };
    for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
    const sim: any = new PlaySim(setup); let done = false;
    const t0 = sim.tick.bind(sim);
    sim.tick = () => { t0(); const b = sim.qb.behavior, m = b?.mind; if (!m || done || sim.t < 1.2) return; done = true;
      for (const d of sim.defense) { if (/^(DE|DT|NT)/.test(d.slot)) continue; const e = m.estimate(d), u = m.unseenFor(d), delay = Math.max(0, m.pictureAge(d) - u), a = m.seenAccel ? m.seenAccel(d) : { x: 0, y: 0 };
        const p1 = { x: e.pos.x + e.vel.x * delay, y: e.pos.y + e.vel.y * delay }, dt = Math.min(delay, 0.5);
        const p2 = { x: p1.x + 0.5 * a.x * dt * dt, y: p1.y + 0.5 * a.y * dt * dt };
        const err = (p: any) => Math.hypot(p.x - d.pos.x, p.y - d.pos.y), verr = Math.hypot(e.vel.x - d.vel.x, e.vel.y - d.vel.y);
        const k = u > 0.5 ? 'unseen>0.5' : delay > 0.4 ? 'periph(delay>0.4)' : 'clear';
        (acc[k] ??= []).push([err(e.pos), err(p1), err(p2), verr, Math.hypot(d.vel.x, d.vel.y)]); }
      sim.phase = 'dead'; };
    try { sim.run(); } catch {}
  }
}
for (const [k, v] of Object.entries(acc)) { const m = (i: number) => (v.reduce((s, r) => s + r[i], 0) / v.length).toFixed(2); console.log(k, 'n', v.length, 'pos err: estimate', m(0), 'projected', m(1), '+accel', m(2), '| vel err', m(3), 'true speed', m(4)); }
