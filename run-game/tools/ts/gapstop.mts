/** Gap runs (power/counter/trap) whose first carrier contact is behind the LOS: the stopping defender D, who was
 * assigned to him at the snap, his engagement history (blocker, start, end, end reason), and a class:
 *   unassigned / assigned blocker never engaged him / shed then free / still engaged at contact.
 * Prints counts and per-class example timelines (every 0.2 s: D, his assigned blocker, the carrier). */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const seeds = process.argv.slice(2).map(Number);
const cls: Record<string, number> = {}, sub: Record<string, number> = {}; const ex: Record<string, string[]> = {};
let gap = 0, stops = 0; const pens: Record<string, number> = {}, penTop: Record<string, number> = {};
for (const seed of seeds) for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? ''; if (!/^(power|counter|trap)$/.test(sch)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  gap++;
  const dir = sim.attackDir('O');
  const plan0 = new Map<any, any>();
  for (const o of sim.offense) if (o.behavior instanceof RunBlocker) plan0.set(o, { kind: o.behavior.plan.kind, role: o.behavior.plan.pullRole, target: o.behavior.plan.target });
  const hist = new Map<any, { b: string; t0: number; t1: number }[]>();
  const snaps: Record<number, any> = {};
  const fc: any = { t: -1 };
  while (sim.phase === 'live' && sim.t < 5) {
    sim.tick();
    for (const d of sim.defense) {
      const h = hist.get(d) ?? []; hist.set(d, h);
      const e = d.engagement, cur = h.at(-1);
      const who = e && e.defender === d ? e.blocker.slot + (e.helpers.length ? '+' + e.helpers.map((x: any) => x.slot).join('+') : '') : null;
      if (who && (!cur || cur.t1 >= 0 || cur.b !== who)) { if (cur && cur.t1 < 0) cur.t1 = sim.t; h.push({ b: who, t0: sim.t, t1: -1 }); }
      if (!who && cur && cur.t1 < 0) cur.t1 = sim.t;
    }
    if (Math.round(sim.t * 100) % 20 === 0) snaps[Math.round(sim.t * 10)] = sim.agents.map((a: any) => ({ x: a.pos.x, y: a.pos.y, eng: a.engagement ? (a.team === 'O' ? a.engagement.defender.slot : a.engagement.blocker.slot) : '' }));
    const c = sim.carrier;
    if (fc.t < 0) { const ev = sim.events.find((e: any) => e.type === 'carrier_contact'); if (ev) { fc.t = ev.t; fc.d = sim.agents[sim.agents[ev.a].team === 'D' ? ev.a : ev.b]; fc.cx = c ? (c.pos.x - sim.los) * dir : 0; fc.c = c; } }
  }
  if (fc.t < 0 || fc.cx > 0 || !fc.d) continue;
  stops++;
  const D = fc.d, h = hist.get(D) ?? [];
  const assigned = [...plan0].filter(([, pl]) => pl.target === D).map(([o, pl]) => ({ o, pl }));
  const asg = assigned.map(x => `${x.o.slot}:${x.pl.kind}${x.pl.role ? '/' + x.pl.role : ''}`).join(',') || 'nobody';
  const atContact = h.find(x => x.t0 <= fc.t && (x.t1 < 0 || x.t1 > fc.t - 1e-9));
  const shed = sim.events.filter((e: any) => e.type === 'shed' && e.a === D.idx && e.t <= fc.t).map((e: any) => `${e.t.toFixed(2)} ${e.detail ?? ''}`);
  const engagedByAssigned = assigned.some(x => h.some(r => r.b.split('+').includes(x.o.slot)));
  const grp = /^LB/.test(D.slot) ? 'LB' : /^(DE|DT|NT)/.test(D.slot) ? 'DL' : 'DB';
  let k: string;
  if (atContact) k = 'still engaged at contact';
  else if (!assigned.length) k = h.length ? 'unassigned, blocked by someone then free' : 'unassigned, never blocked';
  else if (!engagedByAssigned) k = h.length ? 'assigned blocker never got him (someone else did, then free)' : 'assigned blocker never got him (never blocked)';
  else k = 'assigned blocker had him, then free';
  const key = `${grp} | ${k}`; cls[key] = (cls[key] ?? 0) + 1;
  const s10 = snaps[10], s04 = snaps[4];
  const d10 = s10 ? (sim.los - s10[D.idx].x) * dir : 0;
  const pen = d10 > 1 ? 'DL >1 yd deep at 1.0 s' : d10 > 0 ? 'DL 0-1 yd deep at 1.0 s' : 'DL not past the LOS at 1.0 s';
  const gapA = assigned.length && s04 ? Math.min(...assigned.map(x => Math.hypot(s04[x.o.idx].x - s04[D.idx].x, s04[x.o.idx].y - s04[D.idx].y))) : NaN;
  const pk = `${pen} | ${k} | assigned ${assigned.map(x => x.pl.kind + (x.pl.role ? '/' + x.pl.role : '')).join('+') || 'nobody'}${isNaN(gapA) ? '' : gapA > 2 ? ' (blocker >2 yd away at 0.4 s)' : ' (blocker within 2 yd at 0.4 s)'}`;
  pens[pk] = (pens[pk] ?? 0) + 1; penTop[pen] = (penTop[pen] ?? 0) + 1;
  const asgKinds = assigned.map(x => x.pl.kind + (x.pl.role ? '/' + x.pl.role : '')).join('+') || 'nobody';
  sub[`${sch} ${grp} ${k} [assigned: ${asgKinds}]`] = (sub[`${sch} ${grp} ${k} [assigned: ${asgKinds}]`] ?? 0) + 1;
  (ex[key] ??= []);
  if (ex[key].length < 3) {
    const lines = [`  seed ${seed} #${pi} ${sch}: ${D.slot} stops carrier at ${fc.t.toFixed(2)} s, ${fc.cx.toFixed(2)} yd; assigned ${asg}; engagements ${h.map(r => `${r.b} ${r.t0.toFixed(2)}-${r.t1 < 0 ? 'end' : r.t1.toFixed(2)}`).join(', ') || 'none'}; sheds ${shed.join('; ') || 'none'}`];
    const tracked = [D, ...assigned.map(x => x.o), fc.c].filter(Boolean);
    for (const t of [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]) {
      const s = snaps[t]; if (!s || t / 10 > fc.t + .05) continue;
      lines.push(`    ${(t / 10).toFixed(1)} ` + tracked.map((a: any) => `${a.slot} (${((s[a.idx].x - sim.los) * dir).toFixed(1)},${s[a.idx].y.toFixed(1)})${s[a.idx].eng ? '~' + s[a.idx].eng : ''}`).join('  '));
    }
    ex[key].push(lines.join('\n'));
  }
}
console.log(`gap runs ${gap}, first carrier contact behind the LOS ${stops}`);
for (const [k, v] of Object.entries(cls).sort((a, b) => b[1] - a[1])) console.log(`  ${v}  ${k}`);
console.log('by scheme and assignment:');
for (const [k, v] of Object.entries(sub).sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(`  ${v}  ${k}`);
console.log('by stopper depth at 1.0 s:'); for (const [k, v] of Object.entries(penTop).sort((a, b) => b[1] - a[1])) console.log(`  ${v}  ${k}`);
for (const [k, v] of Object.entries(pens).sort((a, b) => b[1] - a[1]).slice(0, 16)) console.log(`  ${v}  ${k}`);
