// One run-only snap: find the wide edges (run_film_reference.py's rule on true
// positions at the snap) and print the backside one's controller, job, raw
// objective, speed, and lateral cushion on the carrier every 0.25 s.
//   node --import tsx scripts/diag/edge/end-trace.ts LABEL PLAY-ID [FROM TO]
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
const [label, id, from = '0', to = '4'] = process.argv.slice(2);
const p = (JSON.parse(readFileSync(`out/matched-restage/seed${label}.json`, 'utf8')) as any[]).find(x => x.id === id);
const probe: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
let crossY: number | null = null; const dir0 = probe.attackDir('O');
const tick0 = probe.tick.bind(probe);
probe.tick = () => { tick0(); const c = probe.carrier; if (crossY === null && c && c.slot !== 'QB' && (c.pos.x - probe.los) * dir0 > 0) crossY = c.pos.y; };
probe.run();
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const dir = sim.attackDir('O'), ol = sim.offense.filter((o: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
const cy = ol.reduce((s: number, o: any) => s + o.pos.y, 0) / ol.length;
const playSide = crossY === null ? 0 : Math.sign(crossY - cy);
const edges = [1, -1].map(s => sim.defense.filter((d: any) => (d.pos.x - sim.los) * dir < 1.8 && /^(DE|DT|NT|LB|OLB|EDGE)/.test(d.slot) && (d.pos.y - cy) * s > 0)
  .sort((a: any, b: any) => (b.pos.y - cy) * s - (a.pos.y - cy) * s)[0]);
const back = playSide === 0 ? null : edges[playSide > 0 ? 1 : 0];
console.log(`${id} ${sim.offCall.label} vs ${sim.defCall.label}; play side ${playSide > 0 ? '+y' : '-y'}; backside edge ${back?.slot}`);
if (!back) process.exit(0);
const trace = sim.recordCommands({ actor: { team: 'D', slot: back.slot }, from: Number(from), to: Number(to) });
sim.run();
for (const s of trace.steps as any[]) {
  if (Math.round(s.stepStart * 100) % 25) continue;
  const c = sim.carrier, o = s.decision?.raw.objective, pos = s.start.body.position, v = s.start.body.velocity;
  const fit = (s.pursuit ?? []).length ? 'chase' : '';
  const e = s.start.engagement;
  console.log(`${s.stepStart.toFixed(2)}  ${s.decision?.owner.controller}/${s.decision?.owner.kind} job=${s.decision?.owner.job ?? '-'} ${fit}`
    + `  speed ${Math.hypot(v.x, v.y).toFixed(2)}  obj ${o ? `${o.kind} y=${o.point.y.toFixed(1)} x=${((o.point.x - sim.los) * dir).toFixed(1)}` : '-'}`
    + `  ${e ? `ENGAGED ${e.type} by ${e.blocker.slot}` : 'free'}  his y-cy ${((pos.y - cy) * -playSide).toFixed(1)} x ${((pos.x - sim.los) * dir).toFixed(1)}`);
}
