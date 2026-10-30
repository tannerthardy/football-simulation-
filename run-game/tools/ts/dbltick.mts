/** One joined IZ double, tick by tick: helper rel DL (lat +away from owner, depth along axis), branch, final request,
 * achieved rel velocity, helper joint extension/normal/tangent force, World contacts of the helper. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const { axisOf } = await import(root + '/src/sim/engagement.ts');
const [seed, skip = '0', count = '1'] = process.argv.slice(2);
let shown = 0, k = 0;
const hb = new Map<any, any>(); (globalThis as any).__HB = (h: any, kk: string, spot: any, feet: any) => hb.set(h, { k: kk, spot, feet });
for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || shown >= Number(count)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/insideZone|splitZone/.test(sim.offCall.run?.scheme ?? '')) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  let lines: string[] = [], cb0: any = null;
  while (sim.phase === 'live' && sim.t < 2.0) {
    hb.clear(); sim.tick();
    let once = false; for (const o of sim.offense) { if (once) break;
      const b: any = o.behavior; const cb = b?.plan?.combination;
      if (!(b instanceof RunBlocker) || !cb || cb.released || (cb0 && cb !== cb0)) continue;
      const e = cb.defender.engagement;
      if (!e || !cb.members.every((m: any) => m.engagement === e) || !e.helpers[0]) continue;
      cb0 = cb; once = true;
      const owner = e.blocker, h = e.helpers[0], d = e.defender;
      const axis = axisOf(sim, e), lat = { x: -axis.y, y: axis.x };
      const away = Math.sign((h.pos.x - owner.pos.x) * lat.x + (h.pos.y - owner.pos.y) * lat.y) || 1;
      const L = (v: any) => (v.x * lat.x + v.y * lat.y) * away, A = (v: any) => v.x * axis.x + v.y * axis.y;
      const rel = (a: any) => ({ x: a.pos.x - d.pos.x, y: a.pos.y - d.pos.y });
      const OI = sim.intents[owner.idx].vel, oj = e.hands;
      const extra = ` || O req lat ${L(OI).toFixed(2)} dep ${A(OI).toFixed(2)} | abs v lat/dep O ${L(owner.vel).toFixed(2)}/${A(owner.vel).toFixed(2)} H ${L(h.vel).toFixed(2)}/${A(h.vel).toFixed(2)} D ${L(d.vel).toFixed(2)}/${A(d.vel).toFixed(2)} | DLreq ${L(sim.intents[d.idx].vel).toFixed(2)}/${A(sim.intents[d.idx].vel).toFixed(2)} | oj N ${(oj?.normalForce ?? 0).toFixed(0)} T ${(oj?.tangentForce ?? 0).toFixed(0)}`;
      const j = e.helperHands?.get(h), r = hb.get(h), I = sim.intents[h.idx].vel;
      const cs = (sim.lastStep?.contacts ?? []).filter((c: any) => c.i === h.idx || c.j === h.idx).map((c: any) => sim.agents[c.i === h.idx ? c.j : c.i].slot).join(',');
      lines.push(`${sim.t.toFixed(2)} ${owner.slot}+${h.slot} on ${d.slot} | H lat ${L(rel(h)).toFixed(2)} dep ${A(rel(h)).toFixed(2)} | O lat ${L(rel(owner)).toFixed(2)} dep ${A(rel(owner)).toFixed(2)} | ${r?.k ?? '-'} req lat ${L(I).toFixed(2)} dep ${A(I).toFixed(2)} | ach rel lat ${L({x:h.vel.x-d.vel.x,y:h.vel.y-d.vel.y}).toFixed(2)} dep ${A({x:h.vel.x-d.vel.x,y:h.vel.y-d.vel.y}).toFixed(2)} | j ext ${j?.extension?.toFixed(2)} N ${(j?.normalForce ?? 0).toFixed(0)} T ${(j?.tangentForce ?? 0).toFixed(0)} push ${(j?.push ?? 0).toFixed(0)} | contacts ${cs}` + extra);
    }
  }
  if (lines.length > 8 && k++ >= Number(skip)) { shown++; console.log(`play ${p.id ?? ''} ${sim.offCall.run.scheme}`); console.log(lines.join('\n')); }
}
