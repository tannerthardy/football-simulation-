/** IZ combo helper (combination.members[1]) from the snap until he joins the rep: position rel. the DL (field lat +away
 * from partner, depth in front), command velocity (lat, upfield), achieved, collection read active, plan kind. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const [seed, skip = '0', count = '1'] = process.argv.slice(2);
let shown = 0, k = 0;
for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || shown >= Number(count)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/insideZone|splitZone/.test(sim.offCall.run?.scheme ?? '')) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const cb = sim.offense.map((o: any) => o.behavior?.plan?.combination).find((c: any) => c);
  if (!cb) continue;
  const [own, h] = cb.members, d = cb.defender, up = sim.attackDir('O');
  const lines: string[] = [];
  while (sim.phase === 'live' && sim.t < 1.2) {
    sim.tick();
    const aw = Math.sign(h.pos.y - own.pos.y) || 1, b: any = h.behavior;
    const joined = d.engagement && h.engagement === d.engagement;
    lines.push(`${sim.t.toFixed(2)} ${h.slot}(${b.plan.kind}) on ${d.slot} | lat ${((h.pos.y - d.pos.y) * aw).toFixed(2)} dep ${((d.pos.x - h.pos.x) * up).toFixed(2)} | cmd lat ${(sim.cmds[h.idx].vel.y * aw).toFixed(2)} up ${(sim.cmds[h.idx].vel.x * up).toFixed(2)} | fin lat ${(sim.intents[h.idx].vel.y * aw).toFixed(2)} up ${(sim.intents[h.idx].vel.x * up).toFixed(2)} | ach lat ${(h.vel.y * aw).toFixed(2)} up ${(h.vel.x * up).toFixed(2)} | DL v lat ${(d.vel.y * aw).toFixed(2)} up ${(d.vel.x * up).toFixed(2)} | coll ${b.collectionRead?.choice ? 'Y' : '-'} ${joined ? 'JOINED' : ''}`);
    if (joined) break;
  }
  if (k++ >= Number(skip)) { shown++; console.log(`${sim.offCall.run.scheme} ${own.slot}+${h.slot} on ${d.slot}`); console.log(lines.join('\n')); }
}
