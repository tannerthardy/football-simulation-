/** For each run snap (shift 0) whose first carrier contact is behind the LOS: the carrier's mode at contact (crease read
 * / designed / open field), and for the last crease-read selection within 0.8 s before contact, the toucher's
 * clearance from the selected first leg (center distance minus both radii) at selection time, his engagement then,
 * and whether the selection's own obstruction term charged him. args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { runReadObservers } = await import(root + '/src/sim/run-read-observer.ts');
const out: Record<string, number[]> = {}; const cnt: Record<string, number> = {};
const add = (k: string, v: number) => (out[k] ??= []).push(v); const inc = (k: string) => cnt[k] = (cnt[k] ?? 0) + 1;
for (const seed of process.argv.slice(2)) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const sch = sim.offCall.run?.scheme ?? ''; const fam = /^(power|counter|trap)$/.test(sch) ? 'gap' : /zone|duo/i.test(sch) ? 'zone' : 'other';
  const sels: any[] = [];
  runReadObservers.set(sim, (e: any) => { if (e.phase === 'aim' && e.selected && sim.carrier) sels.push({ t: e.t, from: { ...sim.carrier.pos }, to: { ...e.selected }, defs: sim.defense.map((d: any) => ({ pos: { ...d.pos }, eng: !!d.engagement, r: d.profile.radius, reach: d.profile.reach })), cr: sim.carrier.profile.radius }); });
  let fc: any = null, mode = '';
  while (sim.phase === 'live' && sim.t < 6) {
    sim.tick();
    if (!fc) { const ev = sim.events.find((e: any) => e.type === 'carrier_contact'); if (ev) { const c = sim.carrier; const d = sim.agents[sim.agents[ev.a].team === 'D' ? ev.a : ev.b]; fc = { t: ev.t, d, x: c ? (c.pos.x - sim.los) * sim.attackDir('O') : 9 };
      const b: any = c?.behavior; mode = c?.tags.has('run-crease-read') && !b?.wasDesigned ? 'crease' : b?.wasDesigned ? 'designed' : 'open'; break; } }
  }
  if (!fc || fc.x >= 0 || fc.d.team !== 'D') continue;
  inc(`${fam} n`); inc(`${fam} mode ${mode}`);
  const s = [...sels].reverse().find((q) => q.t <= fc.t && q.t >= fc.t - 0.8);
  if (!s) { inc(`${fam} no crease selection within 0.8 s`); continue; }
  const dd = s.defs[fc.d.idx - sim.offense.length] ?? s.defs.find((_: any, i: number) => sim.defense[i] === fc.d);
  const di = sim.defense.indexOf(fc.d), D = s.defs[di];
  const sx = s.to.x - s.from.x, sy = s.to.y - s.from.y, l2 = sx * sx + sy * sy || 1;
  const u = Math.max(0, Math.min(1, ((D.pos.x - s.from.x) * sx + (D.pos.y - s.from.y) * sy) / l2));
  const dist = Math.hypot(s.from.x + u * sx - D.pos.x, s.from.y + u * sy - D.pos.y);
  const clear = dist - D.r - s.cr;
  add(`${fam} clearance`, clear);
  inc(`${fam} toucher ${D.eng ? 'engaged' : 'free'} at selection`);
  inc(`${fam} ${clear < 0 ? 'route through his body' : clear < D.reach ? 'route within his reach' : 'route clear of his reach'}`);
  inc(`${fam} charged by obstruction (miss<0 w/ 0.7r)` + (dist - D.r - 0.7 * s.cr < 0 ? ' yes' : ' no'));
}
const med = (v: number[]) => v.slice().sort((a, b) => a - b)[v.length >> 1];
for (const [k, v] of Object.entries(cnt).sort()) console.log(k, v);
for (const [k, v] of Object.entries(out)) console.log(k, 'median', med(v).toFixed(2), 'n', v.length);
