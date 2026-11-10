// For each throw: how long before the release the QB's body facing has been within 20 deg of the target (continuously),
// and the windup (motion) duration.
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
const held: number[] = [], wind: number[] = [], setToRel: number[] = [];
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; for (let k = 0; k < 4; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    const hist: any[] = []; let t0 = -1, T: any = null, wAt = -1; const tick = sim.tick.bind(sim);
    sim.tick = () => { const air = sim.ball.kind === 'air'; tick(); if (wAt < 0 && sim.windupAt >= 0) wAt = sim.windupAt;
      hist.push({ t: sim.t, f: sim.qb.body.facing, q: { ...sim.qb.pos }, v: Math.hypot(sim.qb.vel.x, sim.qb.vel.y), pos: sim.offense.map((o: any) => ({ ...o.pos })) });
      if (t0 < 0 && !air && sim.ball.kind === 'air') { t0 = sim.t; T = sim.ball.target; } };
    sim.run(); if (t0 < 0 || !T) continue;
    const ti = sim.offense.indexOf(T); let h = 0;
    for (let i = hist.length - 1; i >= 0; i--) { const H = hist[i]; if (H.t > t0) continue; const to = Math.atan2(H.pos[ti].y - H.q.y, H.pos[ti].x - H.q.x);
      const d = Math.abs(((H.f - to + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI); if (d > 0.35) break; h = t0 - H.t; }
    held.push(h); if (wAt >= 0) wind.push(t0 - wAt); } }); }
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
console.log('QB squared to the target before release p25/50/75', q(held, .25).toFixed(2), q(held, .5).toFixed(2), q(held, .75).toFixed(2), 'n', held.length);
console.log('windup to release p25/50/75', q(wind, .25).toFixed(2), q(wind, .5).toFixed(2), q(wind, .75).toFixed(2));
