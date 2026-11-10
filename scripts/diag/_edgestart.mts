/** OZ play-side edge man, 0-1.5 s: request (owner, raw/final) vs achieved, lateral
 * toward the play side and depth (Run Game's edgereach definition: first defender on
 * the line, |x| <= 1.6, outside the play-side tackle at the snap; play side from the
 * call's run direction). usage: node --import tsx scripts/diag/_edgestart.mts [seed...] */
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const seeds = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29];
for (const seed of seeds) { let i = 0; for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  const id = `s${seed}-${i++}`; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
  if (!/outsideZone|wideZone/.test(st.offCall?.run?.scheme ?? '')) continue;
  const probe: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const dir = probe.attackDir(probe.offense[0].team), los = probe.los;
  // play side: where the back goes over the first 1.0 s after the handoff
  const sideSim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  let side = 0; try { while (sideSim.phase === 'live' && sideSim.t < 3) { sideSim.tick(); if (sideSim.handoffAt >= 0 && sideSim.t >= sideSim.handoffAt + 1) break; } } catch { continue; }
  const rb = sideSim.offense.find((a: any) => a.slot === 'RB'); const rb0 = probe.offense.find((a: any) => a.slot === 'RB');
  side = Math.sign((rb?.pos.y ?? 0) - (rb0?.pos.y ?? 0)); if (!side) continue;
  const tackle = probe.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT').sort((a: any, b: any) => (b.pos.y - a.pos.y) * side)[0];
  const edge = probe.defense.filter((d: any) => Math.abs((d.pos.x - los) * dir) <= 1.6 && (d.pos.y - tackle.pos.y) * side > 0)
    .sort((a: any, b: any) => (a.pos.y - b.pos.y) * side)[0];
  if (!edge) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const tr = sim.recordCommands({ actor: { team: edge.team, slot: edge.slot }, from: 0, to: 1.55 });
  const a = sim.defense.find((d: any) => d.slot === edge.slot); const y0 = a.pos.y, x0 = a.pos.x;
  const tags: Record<string, string> = {}, eng: Record<string, string> = {};
  try { while (sim.phase === 'live' && sim.t < 1.55) { sim.tick(); tags[sim.t.toFixed(2)] = [...a.tags].join(','); eng[sim.t.toFixed(2)] = a.engagement ? a.engagement.blocker.slot : '-'; } } catch { continue; }
  const rows = tr.steps.filter((s: any) => s.final && Math.round(s.stepStart * 20) % 2 === 0).map((s: any) => ({
    t: +s.stepStart.toFixed(2), owner: s.decision?.owner?.kind ?? '-', rawLat: +((s.decision?.raw?.vel?.y ?? 0) * side).toFixed(2), finLat: +(s.final.vel.y * side).toFixed(2),
    gotLat: +(s.endpoint.body.velocity.y * side).toFixed(2), finUp: +(-s.final.vel.x * dir).toFixed(2), gotUp: +(-s.endpoint.body.velocity.x * dir).toFixed(2), dep: +(((s.endpoint.body.position?.x ?? a.pos.x) - los) * dir).toFixed(2), lat: +(((s.endpoint.body.position?.y ?? a.pos.y) - y0) * side).toFixed(2), rew: s.rewrites.map((r: any) => r.stage).join('+') || '-',
    eng: eng[(s.stepStart + .05).toFixed(2)] ?? '?', tags: tags[(s.stepStart + .05).toFixed(2)] ?? '' }));
  console.log(JSON.stringify({ id, slot: edge.slot, tech: edge.behavior?.kind, fit: edge.runFit ? `${edge.runFit.kind}${edge.runFit.gap}:${edge.runFit.edge ?? ''}` : '-', side, lat10: null, rows }));
} }
