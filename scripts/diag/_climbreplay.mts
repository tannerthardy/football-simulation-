/** Free climbers (RunBlocker plan climb, not engaged, no body within radii+0.1 yd): log the final request each
 * tick, then replay that exact request sequence on a lone copy of his body (same World). If the lone replay
 * reproduces the in-game heading wander, the request sequence causes it; if not, something else in the game does.
 * usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
import { previewFreeMovement } from '../../src/physics/movement-preview.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const game: number[] = [], lone: number[] = [], reqChurn: number[] = [], gSpeed: number[] = [], lSpeed: number[] = [];
let windows = 0;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const logs = new Map<any, any>();
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    const before = new Map<any, any>();
    for (const a of sim.offense) if ((a.behavior as any)?.plan?.kind === 'climb' && !a.engagement) before.set(a, { body: { ...a.body, pos: { ...a.body.pos }, vel: { ...a.body.vel }, support: a.body.support ? JSON.parse(JSON.stringify(a.body.support)) : undefined } });
    t0();
    for (const [a, b] of before) {
      const clear = !sim.agents.some((o: any) => o !== a && Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y) < o.profile.radius + a.profile.radius + 0.1);
      const iv = sim.intents[a.idx];
      let L = logs.get(a);
      if (!clear || !iv || a.engagement) { if (L && L.seq.length >= 8) { (L.done ??= []).push(L.seq); } logs.delete(a); continue; }
      if (!L) { L = { seq: [], start: b.body }; logs.set(a, L); }
      L.seq.push({ intent: { ...iv, vel: { ...iv.vel } }, vel: { ...a.vel } });
      (a as any).__climbLog = L;
    }
  };
  sim.run();
  const all = [...logs.values()];
  for (const L of all) {
    const seq = L.seq; if (seq.length < 8) continue; windows++;
    let k = 0;
    const samples = previewFreeMovement(L.start, (() => (seq[Math.min(k++, seq.length - 1)].intent)) as any, 0, seq.length);
    for (let i = 1; i < seq.length; i++) {
      game.push(Math.abs(wrap(Math.atan2(seq[i].vel.y, seq[i].vel.x) - Math.atan2(seq[i - 1].vel.y, seq[i - 1].vel.x))) * 180 / Math.PI / sim.dt);
      lone.push(Math.abs(wrap(Math.atan2(samples[i].vel.y, samples[i].vel.x) - Math.atan2(samples[i - 1].vel.y, samples[i - 1].vel.x))) * 180 / Math.PI / sim.dt);
      reqChurn.push(Math.abs(wrap(Math.atan2(seq[i].intent.vel.y, seq[i].intent.vel.x) - Math.atan2(seq[i - 1].intent.vel.y, seq[i - 1].intent.vel.x))) * 180 / Math.PI / sim.dt);
      gSpeed.push(Math.hypot(seq[i].vel.x, seq[i].vel.y)); lSpeed.push(Math.hypot(samples[i].vel.x, samples[i].vel.y));
    }
  }
}
const q = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
console.log(`free climb windows ${windows}, ticks ${game.length}`);
console.log(`request heading churn p50/p75 ${q(reqChurn).toFixed(0)}/${q(reqChurn, .75).toFixed(0)} deg/s`);
console.log(`in-game velocity heading rate p50/p75 ${q(game).toFixed(0)}/${q(game, .75).toFixed(0)} deg/s, speed p50 ${q(gSpeed).toFixed(2)}`);
console.log(`lone replay of the same requests: heading rate p50/p75 ${q(lone).toFixed(0)}/${q(lone, .75).toFixed(0)} deg/s, speed p50 ${q(lSpeed).toFixed(2)}`);
