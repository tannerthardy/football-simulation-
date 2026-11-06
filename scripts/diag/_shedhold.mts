/** "Tried, still held": while a run-blocked DL/LB is attempting to shed (tag shed-attempt, still engaged), what force
 * keeps him attached? Per sampled tick: the hand joint's tension (normalForce < 0 pulls him back; capacity `hold`),
 * steering force vs its cap, who holds; his request vs achieved velocity relative to the blocker. Per attempt window:
 * freed within 1 s or not; holding fouls recorded on the play. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const S: any[] = []; const W: any[] = []; let plays = 0, holdFouls = 0, holdRecords = 0;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; plays++;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const win = new Map<any, any>();
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0();
    if (!sim.carrier || sim.carrier === sim.qb) return;
    for (const d of sim.defense) {
      if (!/^(DE|DT|NT|LB)/.test(d.slot)) continue;
      const e = d.engagement, w = win.get(d);
      if (w && !w.done) { if (!e) { w.freed = sim.t - w.t0; w.done = true; } else if (sim.t - w.t0 > 1.0) w.done = true; }
      if (!e || !d.tags.has('shed-attempt')) continue;
      if (!w) win.set(d, { t0: sim.t, slot: d.slot, done: false });
      const b = e.blocker, j = sim.world.joints.find((j: any) => j.kind === 'hands' && ((j.a === b.body && j.b === d.body) || (j.a === d.body && j.b === b.body)));
      const iv = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 };
      const rel = { x: d.vel.x - b.vel.x, y: d.vel.y - b.vel.y }, relReq = { x: iv.x - b.vel.x, y: iv.y - b.vel.y };
      S.push({ joint: !!j, hold: j?.hold ?? 0, steer: j?.steer ?? 0, normal: j?.normalForce ?? 0, tangent: Math.abs(j?.tangentForce ?? 0),
        holder: j ? ((j.holder ?? j.a) === b.body ? 'OL' : 'DL') : '-', ctl: e.control,
        reqRel: Math.hypot(relReq.x, relReq.y), achRel: Math.hypot(rel.x, rel.y), mass: d.profile.massKg });
    }
  };
  sim.run();
  for (const w of win.values()) W.push(w);
  holdFouls += (sim.penalties ?? []).filter((x: any) => x.kind === 'holding').length;
  holdRecords += (sim.foulRecords ?? []).filter((x: any) => x.kind === 'holding').length;
}
const q = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
const J = S.filter(s => s.joint);
const tension = J.filter(s => s.normal < -1e-6), tight = J.filter(s => s.hold > 0 && s.normal < -0.5 * s.hold);
console.log(`run plays ${plays}; shed-attempt engaged samples ${S.length} (with a hand joint ${J.length})`);
console.log(`hand joint pulling him back (tension): ${(100 * tension.length / J.length).toFixed(0)}% of samples; at >= half the grab capacity: ${(100 * tight.length / J.length).toFixed(0)}%`);
console.log(`tension force p50/p90 when pulling: ${q(tension.map(s => -s.normal)).toFixed(0)}/${q(tension.map(s => -s.normal), .9).toFixed(0)} kg*yd/s2 (= ${(q(tension.map(s => -s.normal)) / 10.7).toFixed(0)}/${(q(tension.map(s => -s.normal), .9) / 10.7).toFixed(0)} kgf); grab capacity p50 ${q(J.map(s => s.hold)).toFixed(0)}`);
console.log(`steering force at >= 90% of its cap: ${(100 * J.filter(s => s.steer > 0 && s.tangent >= 0.9 * s.steer).length / J.length).toFixed(0)}%`);
console.log(`holder: OL ${J.filter(s => s.holder === 'OL').length}, DL ${J.filter(s => s.holder === 'DL').length}; control p50 ${q(S.map(s => s.ctl)).toFixed(2)} (+ = blocker)`);
console.log(`relative to the blocker: requested ${q(S.map(s => s.reqRel)).toFixed(2)} yd/s, achieved ${q(S.map(s => s.achRel)).toFixed(2)}`);
const freed = W.filter(w => w.freed !== undefined);
console.log(`shed-attempt windows ${W.length}: freed within 1 s ${freed.length} (${(100 * freed.length / Math.max(1, W.length)).toFixed(0)}%), p50 ${q(freed.map(w => w.freed)).toFixed(2)} s`);
console.log(`holding fouls called ${holdFouls}, holding records ${holdRecords} on ${plays} run plays`);
