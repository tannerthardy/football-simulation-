/** Dither accounting shared by the dither audit (dither-audit.mts) and the suite guard (test/dither-budget.test.ts).
 *
 * It measures requests, never outcomes. For every player on every live tick it compares the requested velocity with the
 * previous tick's. A re-aim is a direction change > 20 deg with both requests > 1 yd/s. Each re-aim is charged to the
 * first pipeline stage whose output turned (or crossed 1 yd/s), from a passive stub of the responsibility ledger, or
 * to a mode switch when the behaviour's kind or pursuit stage changed. A re-aim is reversed when a later request comes
 * back within 20 deg of the one before it, within 0.3 s.
 *
 * Install with `instrument(PlaySim)` once per module instance, then `watch(sim, acc)` on each play before running it. */
import type { PlaySim as PlaySimT } from '../../../src/sim/playsim.js';

export const GROUP: Record<string, string> = { 'qb-pass': 'QB', 'qb-handoff': 'QB', mesh: 'QB', 'pa-fake': 'QB', 'pass-pro': 'block',
  'run-block': 'block', 'screen-block': 'block', 'downfield-block': 'block', 'block-look': 'block', rush: 'rush', blitz: 'rush',
  zone: 'coverage', man: 'coverage', pursuit: 'pursuit', 'run-fit': 'run fit', track: 'pursuit', route: 'route', carrier: 'carrier',
  'scramble-ball': 'loose ball' };
/** Pipeline stages in order (PlaySim.decide, then tick's technique and spacing passes), as the ledger names them. */
export const ORDER = ['decision', 'containment', 'coverage-orientation', 'open-to-ball', 'technique-intents', 'engagement', 'tackle-bond', 'spacing', 'snap-guard'];
export const STAGE_NAME: Record<string, string> = { decision: 'behaviour', containment: 'containment', 'coverage-orientation': 'orientation',
  'open-to-ball': 'open-to-ball', 'technique-intents': 'dive/lunge', engagement: 'engagement', 'tackle-bond': 'tackle bond', spacing: 'spacing',
  'snap-guard': 'snap guard' };

export type Source = { n: number; reversed: number; dv: number[] };
export type Group = { moving: number; reaims: number; reversed: number; dvChange: number[]; dvSteady: number[]; src: Record<string, Source> };
export type Acc = Record<string, Group>;

const ang = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(((Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x)) * 180 / Math.PI + 540) % 360 - 180);
const sp = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);
const turned = (p?: { x: number; y: number }, r?: { x: number; y: number }) => !!p && !!r && sp(p) > 1 && sp(r) > 1 && ang(p, r) > 20;
const stopped = (p?: { x: number; y: number }, r?: { x: number; y: number }) => !!p && !!r && (sp(p) > 1) !== (sp(r) > 1);
const grp = (acc: Acc, g: string): Group => acc[g] ??= { moving: 0, reaims: 0, reversed: 0, dvChange: [], dvSteady: [], src: {} };

const stageOf = new WeakMap<object, string>();
const installed = new WeakSet<object>();

/** Record each player's pursuit stage (diagnostic trace hook only; behaviour does not depend on it). */
export function instrument(PlaySim: typeof PlaySimT): void {
  const proto = PlaySim.prototype as unknown as { commandTraceFor: (a: object) => unknown };
  if (installed.has(proto)) return;
  installed.add(proto);
  const tc0 = proto.commandTraceFor;
  proto.commandTraceFor = function (this: unknown, a: object) {
    const inner = tc0.call(this, a) as Record<string | symbol, unknown> | undefined;
    return new Proxy(inner ?? {}, { get: (o, k) => k === 'pursuit'
      ? (target: unknown, d: { kind?: string; planner?: string; requests?: { stage: string }[] }) => {
        stageOf.set(a, d?.kind === 'chase' ? `${d.planner}:${d.requests?.at(-1)?.stage ?? '-'}` : d?.kind ?? '-');
        return (o as { pursuit?: (t: unknown, d: unknown) => unknown }).pursuit?.(target, d);
      }
      : typeof o[k] === 'function' ? (o[k] as (...x: unknown[]) => unknown).bind(o) : inner ? o[k] : () => undefined });
  };
}

type Row = { req: { x: number; y: number }; ac: number; mode: string; g: string; st: Record<string, { x: number; y: number }>; settle?: string | null;
  change?: { before: { x: number; y: number }; t: number; src: string; g: string; done?: boolean } };

/** Account one play's re-aims into `acc` while it runs. Call before sim.run(). */
export function watch(sim: PlaySimT, acc: Acc): void {
  const s = sim as unknown as { agents: { idx: number; vel: { x: number; y: number }; behavior?: { kind?: string } }[]; intents?: { vel: { x: number; y: number } }[];
    phase: string; t: number; dt: number; tick: () => void; responsibility?: unknown };
  const stv = new Map<object, Record<string, { x: number; y: number }>>();
  const put = (a: object, k: string, c?: { vel?: { x: number; y: number } }) => { if (!c?.vel) return; const m = stv.get(a) ?? {}; m[k] = { ...c.vel }; stv.set(a, m); };
  // A passive stub of the responsibility ledger: it only records each stage's velocity.
  s.responsibility = new Proxy({}, { get: (_o, k) => k === 'decision' ? (a: object, _b: unknown, c: { vel?: { x: number; y: number } }) => put(a, 'decision', c)
    : k === 'stage' ? (st: string, a: object, c: { vel?: { x: number; y: number } }) => put(a, st, c)
    : k === 'stageAll' ? (st: string, I: { vel?: { x: number; y: number } }[]) => I.forEach((c, i) => put(s.agents[i], st, c))
    : () => undefined });
  const hist = new Map<object, Row[]>();
  const tick = s.tick.bind(s);
  s.tick = () => {
    stv.clear();
    tick();
    if (s.phase !== 'live') return;
    for (const a of s.agents) {
      const it = s.intents?.[a.idx]; if (!it) continue;
      const k = a.behavior?.kind ?? 'none';
      const r: Row = { req: { ...it.vel }, ac: sp(a.vel), mode: `${k}|${stageOf.get(a) ?? ''}`, g: GROUP[k] ?? k, st: stv.get(a) ?? {} };
      stageOf.delete(a);
      const H = hist.get(a) ?? []; H.push(r); if (H.length > 8) H.shift(); hist.set(a, H);
      if (H.length < 2) continue;
      const p = H[H.length - 2];
      // the previous tick settles now, in the group it was counted in: speed change after a re-aim, or after a steady tick
      if (p.settle !== undefined) { const P = grp(acc, p.g); if (p.settle) { P.src[p.settle].dv.push(r.ac - p.ac); P.dvChange.push(r.ac - p.ac); } else P.dvSteady.push(r.ac - p.ac); }
      const G = grp(acc, r.g);
      if (sp(p.req) > 1 && sp(r.req) > 1) G.moving += s.dt;
      if (!turned(p.req, r.req)) { r.settle = null; continue; }
      const first = ORDER.find(st => turned(p.st[st], r.st[st]) || stopped(p.st[st], r.st[st]));
      const src = r.mode !== p.mode ? 'mode switch' : first ? STAGE_NAME[first] : 'unattributed';
      G.reaims++; (G.src[src] ??= { n: 0, reversed: 0, dv: [] }).n++;
      r.settle = src; r.change = { before: p.req, t: s.t, src, g: r.g };
    }
    for (const H of hist.values()) {
      const r = H[H.length - 1];
      for (const q of H.slice(0, -1)) {
        if (!q.change || q.change.done || s.t - q.change.t > 0.3 + 1e-9) continue;
        if (sp(r.req) > 1 && ang(q.change.before, r.req) <= 20) { q.change.done = true; const Q = grp(acc, q.change.g); Q.reversed++; Q.src[q.change.src].reversed++; }
      }
    }
  };
}

/** Reversed re-aims per second of moving time, per controller and per (controller, post-decision stage), with the
 * moving time and reversed count behind each, so a guard can skip keys that rest on a handful of events. */
export type Rate = { rate: number; moving: number; reversed: number };
export function rates(acc: Acc): { controller: Record<string, Rate>; stage: Record<string, Rate> } {
  const controller: Record<string, Rate> = {}, stage: Record<string, Rate> = {};
  for (const [g, G] of Object.entries(acc)) {
    if (G.moving <= 0) continue;
    controller[g] = { rate: G.reversed / G.moving, moving: G.moving, reversed: G.reversed };
    for (const [src, S] of Object.entries(G.src)) if (src !== 'behaviour' && src !== 'unattributed')
      stage[`${g} / ${src}`] = { rate: S.reversed / G.moving, moving: G.moving, reversed: S.reversed };
  }
  return { controller, stage };
}
