/** Box backers on matched zone runs, 0-0.6 s: downhill (toward the LOS) request
 * raw / final and achieved, the owning behavior and his read, so a late start
 * can be put on the request (a read holding him) or the body (stance, get-off).
 * Box backer: LB 1.6-7 yd deep within 6 yd of the OL centre at the snap.
 * usage: npm run -s ref -- node --import tsx scripts/diag/_lbstart.mts [seed...] */
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const seeds = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29];
const CON: Record<string, string> = { outsideZone: 'OZ', wideZone: 'OZ', insideZone: 'IZ' };
for (const seed of seeds) { let i = 0; for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  const id = `s${seed}-${i++}`; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); const con = CON[st.offCall?.run?.scheme]; if (!con) continue;
  const probe: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const dir = probe.attackDir(probe.offense[0].team), los = probe.los;
  const ol = probe.offense.filter((a: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot)); const cy = ol.reduce((s: number, a: any) => s + a.pos.y, 0) / ol.length;
  const box = probe.defense.filter((d: any) => /^LB/.test(d.slot) && (d.pos.x - los) * dir > 1.6 && (d.pos.x - los) * dir <= 7 && Math.abs(d.pos.y - cy) <= 6).map((d: any) => d.slot);
  for (const slot of box) {
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    const tr = sim.recordCommands({ actor: { team: sim.defense[0].team, slot }, from: 0, to: 0.65 });
    const a = sim.defense.find((d: any) => d.slot === slot); const d0 = (a.pos.x - los) * dir;
    const reads: Record<string, string> = {};
    try { while (sim.t < 0.65 && sim.phase === 'live') { sim.tick(); reads[sim.t.toFixed(2)] = `${a.recog?.read ?? '-'}`; } } catch { continue; }
    // downhill = toward the LOS: -(x) in the attack frame.
    const dn = (v: any) => v ? +(-(v.x) * dir).toFixed(2) : NaN;
    const rows = tr.steps.filter((s: any) => s.final).map((s: any) => ({ t: +s.stepStart.toFixed(2), owner: s.decision?.owner?.kind ?? '-', raw: dn(s.decision?.raw?.vel), fin: dn(s.final?.vel), got: dn(s.endpoint?.body?.velocity), rawSp: +Math.hypot(s.decision?.raw?.vel?.x ?? 0, s.decision?.raw?.vel?.y ?? 0).toFixed(2), gotSp: +Math.hypot(s.endpoint?.body?.velocity?.x ?? 0, s.endpoint?.body?.velocity?.y ?? 0).toFixed(2), face: +(((s.endpoint?.body?.facing ?? 0) * 180 / Math.PI)).toFixed(0), reqFace: s.decision?.raw?.facing === undefined ? null : +((s.decision.raw.facing * 180 / Math.PI)).toFixed(0), velDir: +((Math.atan2(s.final.vel.y, s.final.vel.x) * 180 / Math.PI)).toFixed(0), label: s.decision?.raw?.label ?? s.decision?.label ?? '', rew: s.rewrites.map((r: any) => r.stage).join('+') || '-', read: reads[(+s.stepStart + .05).toFixed(2)] ?? reads[s.stepStart.toFixed(2)] ?? '?' }));
    console.log(JSON.stringify({ id, con, slot, d0: +d0.toFixed(2), handoff: probe.handoffAt, rows }));
  }
} }
