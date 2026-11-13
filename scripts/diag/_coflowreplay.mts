/** Engaged OL-DL pairs on OZ/WZ in the game: log both bodies' final requests and their hand joint each tick for
 * 0.6 s from 0.4 s after engagement, then replay that log on copies of the two bodies alone (same World, joint
 * fields updated each tick from the log). Compares in-game vs replayed lateral displacement toward the play.
 * Same: the requests and joint drive it. Faster alone: other bodies (third players, piles) slow the pair in game.
 * usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
import { World } from '../../src/physics/world.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const clone = (b: any) => ({ ...b, pos: { ...b.pos }, vel: { ...b.vel }, support: b.support ? JSON.parse(JSON.stringify(b.support)) : undefined });
const rows: any[] = [];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/Outside Zone|Wide Zone/.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const run = sim.offCall?.run; if (!run) continue;
  const side = (run.direction === 'strong' ? 1 : -1) * sim.offAlign.strongSign;
  const tracks = new Map<any, any>();
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    const pre = new Map<any, any>();
    for (const e of sim.engagements ?? []) {
      if (!['LT', 'LG', 'C', 'RG', 'RT'].includes(e.blocker.slot) || !/^(DE|DT|NT)/.test(e.defender.slot)) continue;
      let T = tracks.get(e); if (!T) { T = { since: sim.t, steps: [] }; tracks.set(e, T); }
      if (sim.t - T.since >= 0.4 && T.steps.length < 12 && !T.done) pre.set(e, { O: clone(e.blocker.body), D: clone(e.defender.body) });
    }
    t0();
    for (const [e, s] of pre) {
      const T = tracks.get(e);
      if (!sim.engagements.includes(e)) { T.done = true; continue; }
      const j = sim.world.joints.find((j: any) => j.kind === 'hands' && ((j.a === e.blocker.body && j.b === e.defender.body) || (j.a === e.defender.body && j.b === e.blocker.body)));
      if (!T.start) T.start = s;
      T.steps.push({ io: { ...sim.intents[e.blocker.idx] }, id: { ...sim.intents[e.defender.idx] },
        joint: j ? Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v === e.blocker.body ? 'O' : v === e.defender.body ? 'D' : (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v])) : null,
        posO: { ...e.blocker.pos }, posD: { ...e.defender.pos } });
      T.side = side;
    }
  };
  sim.run();
  for (const T of tracks.values()) {
    if (!T.start || T.steps.length < 12) continue;
    const O = clone(T.start.O), D = clone(T.start.D);
    const o0 = { ...T.start.O.pos }, d0 = { ...T.start.D.pos };
    const w = new World([O, D] as any, { substeps: sim.world.substeps, handContact: sim.world.handContact } as any);
    for (const st of T.steps) {
      w.joints = st.joint ? [Object.fromEntries(Object.entries(st.joint).map(([k, v]) => [k, v === 'O' ? O : v === 'D' ? D : v]))] as any : [];
      w.step([st.io, st.id] as any, sim.dt);
    }
    const last = T.steps[T.steps.length - 1];
    // Direction: the pair's own mean requested lateral (y) direction.
    const my = T.steps.reduce((a: number, s: any) => a + (s.io.vel?.y ?? 0) + (s.id.vel?.y ?? 0), 0);
    const sg = Math.sign(my) || 1;
    rows.push({ gameO: (last.posO.y - o0.y) * sg, gameD: (last.posD.y - d0.y) * sg,
      replO: (O.pos.y - o0.y) * sg, replD: (D.pos.y - d0.y) * sg, toPlay: sg === T.side,
      reqO: T.steps.reduce((a: number, s: any) => a + (s.io.vel?.y ?? 0) * sg, 0) / T.steps.length,
      reqD: T.steps.reduce((a: number, s: any) => a + (s.id.vel?.y ?? 0) * sg, 0) / T.steps.length });
  }
}
const q = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
const dur = 12 * 0.05;
console.log(`engaged OL-DL pairs on OZ/WZ, ${rows.length} windows of ${dur.toFixed(1)} s (from 0.4 s after engagement)`);
console.log(`pairs whose mean request points toward the play: ${rows.filter(r => r.toPlay).length}/${rows.length}`);
console.log(`(below: along each pair's own requested lateral direction) p25/50/75`);
const t3 = (k: string) => [.25, .5, .75].map(f => q(rows.map((r: any) => r[k]), f).toFixed(2)).join('/');
console.log(`request OL ${t3('reqO')} DL ${t3('reqD')} yd/s | in game OL ${t3('gameO')} DL ${t3('gameD')} yd | pair alone OL ${t3('replO')} DL ${t3('replD')} yd`);
console.log(`mean final lateral request toward the play p50: OL ${q(rows.map(r => r.reqO)).toFixed(2)} DL ${q(rows.map(r => r.reqD)).toFixed(2)} yd/s`);
console.log(`lateral displacement toward the play p50, in game: OL ${q(rows.map(r => r.gameO)).toFixed(2)} DL ${q(rows.map(r => r.gameD)).toFixed(2)} yd`);
console.log(`same requests + joint, the pair alone:          OL ${q(rows.map(r => r.replO)).toFixed(2)} DL ${q(rows.map(r => r.replD)).toFixed(2)} yd`);
