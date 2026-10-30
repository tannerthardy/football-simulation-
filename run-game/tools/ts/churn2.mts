/** Free climbers (plan climb with a target, not engaged, carrier not yet at the backer) on run-only captures:
 * request heading turn rate per tick and what changed when it turned > 1 rad/s. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const fam = process.argv[2], seeds = process.argv.slice(3);
const cause: Record<string, number> = {}; const det: Record<string, number[][]> = {}; let ticks = 0, fast = 0; const rates: number[] = [];
const modeOf = (b: any) => b.plan.departure ? 'dep:' + (b.departureAccess?.kind ?? 'none') : b.climbAccess ? 'climb:detour' : 'climb:direct';
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? '';
  if (fam === 'OZ' ? !/outsideZone|wideZone/.test(sch) : fam === 'IZ' ? !/insideZone|splitZone/.test(sch) : !/power|counter|trap/.test(sch)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const dir = sim.attackDir('O'); const prev = new Map<any, any>(); const ledger = sim.recordResponsibility();
  while (sim.phase === 'live' && sim.t < 4) {
    sim.tick();
    const c = sim.carrier;
    for (const o of sim.offense) {
      const b: any = o.behavior;
      if (!(b instanceof RunBlocker) || b.plan.kind !== 'climb' || o.engagement || !b.plan.target) { prev.delete(o); continue; }
      if (c && c !== sim.qb && (c.pos.x - b.plan.target.pos.x) * dir > -1) { prev.delete(o); continue; }
      const iv = sim.intents[o.idx].vel, sp = Math.hypot(iv.x, iv.y);
      const row = [...ledger.data.rows].reverse().find((q: any) => q.actor === o.idx);
      const cur = { h: Math.atan2(iv.y, iv.x), sp, target: b.plan.target, mode: modeOf(b), read: b.climbAccess ?? b.climbRead,
        turn: b.climbAccess?.turn, obstacle: b.climbAccess?.obstacle, rw: (row?.command?.rewrittenBy ?? []).join('>'),
        goal: b.climbAccess?.goal ?? b.climbRead?.meet, pos: { ...o.pos } };
      const q = prev.get(o); prev.set(o, cur);
      if (!q || sp < 1 || q.sp < 1) continue;
      ticks++;
      const dh = Math.abs(Math.atan2(Math.sin(cur.h - q.h), Math.cos(cur.h - q.h))), rate = dh / .05; rates.push(rate);
      if (rate <= 1) continue;
      fast++;
      const gd = cur.goal ? Math.hypot(cur.goal.x - o.pos.x, cur.goal.y - o.pos.y) : 99;
      const k = cur.target !== q.target ? 'target changed' : cur.mode !== q.mode ? `mode ${q.mode} -> ${cur.mode}`
        : cur.read !== q.read ? (cur.mode.endsWith('detour') ? (cur.obstacle !== q.obstacle ? 'new detour, other obstacle' : cur.turn !== q.turn ? 'new detour, side flipped' : 'new detour read, same side') : 'new meet read')
        : cur.rw !== q.rw ? 'spacing rewrite on/off: ' + (cur.rw || q.rw) : gd < 1 ? 'same read, goal < 1 yd away' : 'same read, steering';
      cause[k] = (cause[k] ?? 0) + 1;
      const bd = Math.hypot(b.plan.target.pos.x - o.pos.x, b.plan.target.pos.y - o.pos.y), vs = Math.hypot(o.vel.x, o.vel.y);
      (det[k] ??= []).push([dh, bd, gd, vs, cur.mode.endsWith('detour') || cur.mode === 'dep:detour' ? 1 : 0]);
    }
  }
}
rates.sort((a, b) => a - b); const qn = (f: number) => rates[Math.floor(f * (rates.length - 1))]?.toFixed(2);
console.log(`${fam}: moving climber ticks ${ticks}, turn > 1 rad/s ${(100 * fast / ticks).toFixed(0)}%; rate quartiles ${qn(.25)} / ${qn(.5)} / ${qn(.75)}, p90 ${qn(.9)} rad/s`);
const md = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]?.toFixed(2); };
for (const [k, v] of Object.entries(cause).sort((a, b) => b[1] - a[1]).slice(0, 5)) { const r = det[k];
  console.log(`  ${(100 * v / fast).toFixed(0)}%  ${k} | jump ${md(r.map(x => x[0]))} rad | to backer ${md(r.map(x => x[1]))} yd | to goal ${md(r.map(x => x[2]))} | speed ${md(r.map(x => x[3]))} | in detour ${(r.filter(x => x[4]).length / r.length).toFixed(2)}`); }
