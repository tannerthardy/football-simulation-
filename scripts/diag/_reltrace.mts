/** One freed defender, tick by tick: requested vs achieved velocity, support, joints, contacts.
 * usage: <capFile> <callSubstring> <slot> <tFrom> <tTo> */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [file, callSub, slot, t1, t2] = process.argv.slice(2);
const plays = JSON.parse(readFileSync(file, 'utf8')) as any[];
const p = plays.find(x => !x.pass && String(x.call).includes(callSub));
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
const d = sim.agents.find((a: any) => a.slot === slot);
const f = (v: any) => v ? `(${v.x.toFixed(1)},${v.y.toFixed(1)})` : '-';
const t0 = sim.tick.bind(sim);
sim.tick = () => {
  t0();
  if (sim.t < +t1 - 1e-9 || sim.t > +t2 + 1e-9) return;
  const iv = sim.intents[d.idx]; const s = d.body.support;
  const joints = sim.world.joints.filter((j: any) => (j.a === d.body || j.b === d.body) && !j.broken).map((j: any) => j.kind).join('+') || '-';
  const hits = (sim.lastStep?.contacts ?? []).filter((h: any) => h.i === d.idx || h.j === d.idx).length;
  const yawDeg = (d.body.yaw ?? d.body.facing ?? 0) * 180 / Math.PI;
  console.log(`t ${sim.t.toFixed(2)} beh ${d.behavior?.constructor?.name} eng ${d.engagement ? d.engagement.blocker.slot : '-'} v ${f(d.vel)} |v| ${Math.hypot(d.vel.x, d.vel.y).toFixed(2)} req ${f(iv?.vel)} face ${yawDeg.toFixed(0)} reqFace ${iv?.facing != null ? (iv.facing * 180 / Math.PI).toFixed(0) : '-'} | sup ${s?.state} post ${s?.posture?.toFixed(2)} xi ${f(s?.xi)} lock ${s?.feetLock?.toFixed(2)} acc ${f(s?.accel)} load ${f(s?.felt)} out ${s?.out?.toFixed(2)} | joints ${joints} hits ${hits} tags ${[...d.tags].join(",")} dbg ${(d as any).dbg} fit ${d.runFit?.kind}`); (d as any).dbg = undefined;
};
sim.run();
