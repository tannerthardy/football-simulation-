// Deep crossers against Cover 1: what the route asks for and what he gets, 0.5-2.5 s (Run Game, 2026-11-14).
// Per 0.25 s: requested speed (his MoveCommand), achieved speed, depth, his man's offset, the nearest other body and
// whether it is in his path (ahead within 1.5 yd of his line), and the tags on him (route-craft = steering round a body).
// HIPS_EARLY=1 (probe arm, not an engine flag): his man's hips open as soon as he has observed the release.
//   node scripts/ref.mjs -- npx tsx scripts/diag/crosser/deep-cross-probe.mts [concept=y_cross] [seeds=12]
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
const concept = PASS_BY_ID[process.argv[2] ?? 'y_cross'], seeds = Number(process.argv[3] ?? 12);
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const agg: Record<string, number[]> = {};
const push = (k: string, v: number) => (agg[k] ??= []).push(v);
for (let s = 1; s <= seeds; s++) for (const flip of [false, true]) {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, kind: 'pass', flip, pass: concept, label: concept.name },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, pressure: null, label: 'C1' },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * s + 7 + (flip ? 1 : 0) });
  const R = sim.offense.find((a: any) => a.behavior instanceof RouteRunner && a.behavior.route.id === 'cross');
  if (!R) continue;
  const man = sim.defense.find((d: any) => sim.defAlign.spots[d.slot]?.manTarget === R.slot);
  let req = { x: 0, y: 0 };
  const beh = R.behavior, up = beh.update.bind(beh);
  beh.update = (a: any, sm: any) => { const c = up(a, sm); req = c.vel ?? { x: 0, y: 0 }; return c; };
  const t0 = sim.tick.bind(sim); let next = 0.5;
  const hipsOf = (d: any): any => { for (let b = d?.behavior, n = 0; b && n < 6; n++) { if ('hipsOpen' in b) return b.hipsOpen;
    b = b.inner ?? b.base ?? b.fallback ?? b.cover ?? b.man; } return undefined; };
  const manBeh = (d: any): any => { for (let b = d?.behavior, n = 0; b && n < 6; n++) { if ('hipsOpen' in b) return b;
    b = b.inner ?? b.base ?? b.fallback ?? b.cover ?? b.man; } return null; };
  // Diagnostic arm only (HIPS_EARLY=1): his hips open as soon as he has observed the release.
  const early = process.env.HIPS_EARLY === '1';
  sim.tick = () => { R.tags?.clear?.(); man?.tags?.clear?.();
    if (early) { const b = manBeh(man); if (b && b.releaseObserved) b.hipsOpen = true; }
    t0();
    if (sim.t < next - 1e-9 || sim.ball.kind !== 'held' || sim.t > 2.51) return;
    const T = next.toFixed(2); next += 0.25;
    const sp = Math.hypot(R.vel.x, R.vel.y), rq = Math.hypot(req.x, req.y);
    const ux = R.vel.x / (sp || 1), uy = R.vel.y / (sp || 1);
    let blocker = 0, nearest = 9;
    for (const o of [...sim.offense, ...sim.defense]) { if (o === R) continue;
      const dx = o.pos.x - R.pos.x, dy = o.pos.y - R.pos.y, along = dx * ux + dy * uy, across = Math.abs(-dx * uy + dy * ux);
      nearest = Math.min(nearest, Math.hypot(dx, dy)); if (along > 0 && along < 3 && across < 1.5) blocker++; }
    push(`req ${T}`, rq); push(`sp ${T}`, sp); push(`x ${T}`, R.pos.x - sim.los); push(`inpath ${T}`, blocker > 0 ? 1 : 0);
    push(`craft ${T}`, R.tags?.has?.('route-craft') ? 1 : 0);
    if (R.tags?.has?.('route-craft') && man) {
      const wp = R.behavior.path[R.behavior.idx]?.p; const rl = Math.hypot(req.x, req.y) || 1;
      if (wp) { const wx = wp.x - R.pos.x, wy = wp.y - R.pos.y, wl = Math.hypot(wx, wy) || 1;
        // + = the bend asks for more depth than his route line (going over the man), - = flatter (under him).
        push(`bend ${T}`, req.x / rl - wx / wl); push(`manover ${T}`, man.pos.x - R.pos.x); }
    } push(`nearest ${T}`, nearest);
    if (man) { push(`mansep ${T}`, Math.hypot(man.pos.x - R.pos.x, man.pos.y - R.pos.y)); push(`manjoint ${T}`, sim.world.joints.some((j: any) => (j.a === R.body || j.b === R.body)) ? 1 : 0);
      const h = hipsOf(man); if (h !== undefined) push(`hips ${T}`, h ? 1 : 0);
      push(`manspeed ${T}`, Math.hypot(man.vel.x, man.vel.y)); push(`pedal ${T}`, man.tags?.has?.('man-pedal') || [...(man.tags ?? [])].some((t: any) => String(t).includes('pedal')) ? 1 : 0);
      (agg[`tags ${T}`] ??= []).push(...[...(man.tags ?? [])].map((t: any) => String(t).length) as any); (globalThis as any).TAGS = ((globalThis as any).TAGS ?? new Set()); for (const t of man.tags ?? []) (globalThis as any).TAGS.add(`${T}:${t}`); }
  };
  sim.run();
}
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
for (const T of ['0.50', '0.75', '1.00', '1.25', '1.50', '1.75', '2.00', '2.25', '2.50']) {
  if (!agg[`sp ${T}`]) continue;
  console.log(`t ${T} n ${agg[`sp ${T}`].length}: req ${med(agg[`req ${T}`]).toFixed(2)} achieved ${med(agg[`sp ${T}`]).toFixed(2)} depth ${med(agg[`x ${T}`]).toFixed(1)}`
    + ` | body in path ${(100 * mean(agg[`inpath ${T}`])).toFixed(0)}% route-craft ${(100 * mean(agg[`craft ${T}`])).toFixed(0)}% nearest ${med(agg[`nearest ${T}`]).toFixed(2)}`
    + (agg[`bend ${T}`] ? ` | bend depth ${med(agg[`bend ${T}`]).toFixed(2)} (over share ${(100 * mean(agg[`bend ${T}`].map((v) => v > 0 ? 1 : 0))).toFixed(0)}%), man deeper by ${med(agg[`manover ${T}`]).toFixed(2)}` : '')
    + (agg[`mansep ${T}`] ? ` | man sep ${med(agg[`mansep ${T}`]).toFixed(2)} speed ${med(agg[`manspeed ${T}`]).toFixed(2)} hips open ${agg[`hips ${T}`] ? (100 * mean(agg[`hips ${T}`])).toFixed(0) + '%' : '?'} pedal ${(100 * mean(agg[`pedal ${T}`])).toFixed(0)}%` : ''));
}
console.log([...((globalThis as any).TAGS ?? [])].filter((t: string) => /^(1.00|1.50|2.00):/.test(t)).join(' '));
