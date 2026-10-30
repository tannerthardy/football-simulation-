/** Joined zone doubles before release, per tick: who is owner (e.blocker) / helper (e.helpers); each member's lateral
 * offset from the DL in the rep frame (+ = away from partner) and distance; the lateral request at the engagement
 * stage vs the final command (after spacing); achieved lateral velocity relative to the DL. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const { axisOf } = await import(root + '/src/sim/engagement.ts');
const fam = process.argv[2], seeds = process.argv.slice(3);
const rows: Record<string, number[]> = {}; let ticks = 0, notHelper = 0;
const push = (k: string, v: number) => (rows[k] ??= []).push(v);
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const run = sim.offCall.run, sch = run?.scheme ?? '';
  if (fam === 'OZ' ? !/outsideZone|wideZone/.test(sch) : !/insideZone|splitZone/.test(sch)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  let engStage: any[] = []; const hb = new Map<any, any>(); (globalThis as any).__HB = (h: any, k: string, spot: any, feet: any) => hb.set(h, { k, spot, feet });
  sim.commandTrace = new Proxy({}, { get: (_t, k) => k === 'stage' ? (name: string, ints: any[]) => { if (name === 'engagement') engStage = ints.map(i => ({ ...i, vel: { ...i.vel } })); } : () => {} });
  while (sim.phase === 'live' && sim.t < 2.5) {
    sim.tick();
    const seen = new Set<any>();
    for (const o of sim.offense) {
      const b: any = o.behavior;
      if (!(b instanceof RunBlocker) || !b.plan.combination) continue;
      const cb = b.plan.combination; if (seen.has(cb) || cb.released) continue; seen.add(cb);
      const e = cb.defender.engagement;
      if (!e || !cb.members.every((m: any) => m.engagement === e)) continue;
      ticks++;
      const owner = e.blocker, helper = e.helpers[0], d = e.defender;
      if (!helper || !cb.members.includes(owner) || !cb.members.includes(helper)) { notHelper++; continue; }
      const axis = axisOf(sim, e), lat = { x: -axis.y, y: axis.x };
      const L = (v: any) => v.x * lat.x + v.y * lat.y, A = (v: any) => v.x * axis.x + v.y * axis.y;
      for (const [nm, a, o] of [['owner', owner, helper], ['helper', helper, owner]] as const) {
        const away = Math.sign(L({ x: a.pos.x - o.pos.x, y: a.pos.y - o.pos.y })) || 1;
        push(nm + ' lateral off DL (+away)', L({ x: a.pos.x - d.pos.x, y: a.pos.y - d.pos.y }) * away);
        push(nm + ' depth off DL (axis)', A({ x: a.pos.x - d.pos.x, y: a.pos.y - d.pos.y }));
        push(nm + ' dist to DL', Math.hypot(a.pos.x - d.pos.x, a.pos.y - d.pos.y));
        push(nm + ' engagement lat request (+away)', L(engStage[a.idx].vel) * away);
        push(nm + ' final lat request (+away)', L(sim.intents[a.idx].vel) * away);
        push(nm + ' engagement fwd request (-axis)', -A(engStage[a.idx].vel));
        push(nm + ' final fwd request (-axis)', -A(sim.intents[a.idx].vel));
        push(nm + ' achieved lat rel DL (+away)', L({ x: a.vel.x - d.vel.x, y: a.vel.y - d.vel.y }) * away);
        push(nm + ' achieved fwd (-axis)', -A(a.vel));
      }
      const r = hb.get(helper); (rows['branch ' + (r?.k ?? 'none')] ??= []).push(1);
      if (r?.spot) { push('helper spot lat off DL (+away)', L({ x: r.spot.x - d.pos.x, y: r.spot.y - d.pos.y }) * (Math.sign(L({ x: helper.pos.x - owner.pos.x, y: helper.pos.y - owner.pos.y })) || 1)); push('helper spot depth off DL', A({ x: r.spot.x - d.pos.x, y: r.spot.y - d.pos.y })); }
      hb.delete(helper);
      const up = sim.attackDir('O');
      for (const [nm, a, o] of [['owner', owner, helper], ['helper', helper, owner]] as const) {
        const aw = Math.sign(a.pos.y - o.pos.y) || 1;
        push('F ' + nm + ' field lat off DL (+away)', (a.pos.y - d.pos.y) * aw);
        push('F ' + nm + ' field depth in front of DL', (d.pos.x - a.pos.x) * up);
        push('F ' + nm + ' field req lat (+away)', sim.intents[a.idx].vel.y * aw);
        push('F ' + nm + ' field req upfield', sim.intents[a.idx].vel.x * up);
        push('F ' + nm + ' field ach lat (+away)', a.vel.y * aw);
        push('F ' + nm + ' field ach upfield', a.vel.x * up);
      }
      push('F drive angle from upfield (deg)', Math.abs(Math.atan2(axis.y, -axis.x * up)) * 180 / Math.PI);
      push('F DL field ach upfield', d.vel.x * up); push('F DL field |lat v|', Math.abs(d.vel.y));
      push('DL achieved fwd (-axis)', -A(d.vel)); push('DL |v|', Math.hypot(d.vel.x, d.vel.y));
      push('radius owner', owner.profile.radius); push('radius DL', d.profile.radius);
    }
  }
}
const md = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
const mn = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
console.log(`${fam}: joined double ticks ${ticks}, without a member helper ${notHelper}`);
for (const [k, v] of Object.entries(rows).sort()) console.log(k.startsWith('branch') ? `  ${k}: ${v.length}` : `  ${k}: med ${md(v).toFixed(2)} mean ${mn(v).toFixed(2)}`);
