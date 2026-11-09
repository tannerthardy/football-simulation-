/** OZ box LB command trace 0.3-1.3 s: raw request, rewrite stages, final, achieved velocity, facing. usage: <capDir> <seed> [n] */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, seed, nArg] = process.argv.slice(2); let shown = 0; const N = Number(nArg ?? 2);
const f = (v: any) => `(${v.x.toFixed(1)},${v.y.toFixed(1)})`;
for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone/i.test(p.call) || shown >= N) continue;
  const probe: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = probe.attackDir(probe.offense[0].team);
  const lb = probe.defense.find((d: any) => d.slot.startsWith('LB') && (d.pos.x - probe.los) * d2 >= 2.5 && Math.abs(d.pos.y - probe.ballY) < 4);
  if (!lb) continue; shown++;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const tr = sim.recordCommands({ actor: { team: lb.team, slot: lb.slot }, from: 0.3, to: 1.3 });
  sim.run();
  console.log(`== ${p.call} ${lb.slot}`);
  for (const s of tr.steps) { if (!s.decision?.evaluated || !s.final) continue;
    console.log(`${s.stepStart.toFixed(2)} ${s.decision.owner.kind} raw=${f(s.decision.raw.vel)} face=${(s.decision.raw.facing ?? NaN).toFixed(2)} rewrites=${s.rewrites.map((r: any) => r.stage).join(',') || '-'} final=${f(s.final.vel)} got=${f(s.endpoint.body.velocity)} bodyFace=${s.endpoint.body.facing.toFixed(2)}`); }
}
