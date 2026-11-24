// Staged call-theory matrix (Rules + Coaching, 2026-11-24; docs/reviews/2026-11-24-call-theory.md §E). One row per play:
// for each receiver (by his number after motion), his route, his separation (the nearest defender, yd) at his break and
// at 1.0 / 1.5 / 2.0 s after the snap; for each defender, whom he covered (the receiver nearest him for most of 0.5-2.0 s);
// for each man defender, his traffic: the ticks in the first 1.5 s that another offensive player was within 1.2 yd of him,
// and his path's extra length over the straight line to where his man was at 1.5 s; jams; the throw and the result.
// The operator reads the defense's call (who was assigned to whom): it measures, nothing in the play reads it.
//   [QB_V2=1] node --import tsx scripts/diag/calls/matrix.ts <concept> <coverage> <seedFrom-seedTo> <formation> [press|off]
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { ROUTES } from '../../../src/playbook/routes.js';

const [concept, coverage, seedArg = '1-12', formation = 'gun_doubles_11', pressArg] = process.argv.slice(2);
// MESH_GAP=<yd>: mesh's under crosser flattens this far under the high one (the reviewer's 0.4 / 1.2 yd sub-cases).
const MESH_GAP = process.env.MESH_GAP ? Number(process.env.MESH_GAP) : null;
if (MESH_GAP !== null) {
  const hi = ROUTES.shallow_high, lo = ROUTES.mesh_under;
  const flat = (r: any) => r.points[r.points.length - 1].d;
  const shift = flat(hi) - MESH_GAP - flat(lo);
  (ROUTES as any).mesh_under_gap = { ...lo, id: 'mesh_under_gap', depth: lo.depth + shift, points: lo.points.map((q: any) => ({ ...q, d: q.d + shift })) };
}
const [s0, s1] = seedArg.split('-').map(Number);
const MID = { playRecognition: 60, decisionMaking: 60, awareness: 60, composure: 60, discipline: 60, anticipation: 60, consistency: 60 };
const r2 = (x: number) => Math.round(x * 100) / 100;
const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);

for (let seed = s0; seed <= s1; seed++) {
  const setup: any = nativeTraceSetup({ concept, coverage, seed, roster: 3, formation, flip: false });
  // press / off: the corners' alignment as called; set on the coverage the defense was given (beside MID in stage.ts).
  if (pressArg === 'press' || pressArg === 'off') setup.defCall = { ...setup.defCall, coverage: { ...setup.defCall.coverage, press: pressArg === 'press' } };
  if (MESH_GAP !== null && setup.offCall.pass) setup.offCall.pass = { ...setup.offCall.pass, strong: { ...setup.offCall.pass.strong, 2: 'mesh_under_gap' } };
  const qbP = setup.offense.QB; for (const [k, v] of Object.entries(MID)) qbP.ratings[k] = v; qbP.experience = 4;
  const sim: any = new PlaySim(setup);
  const tr: Record<number, Array<{ t: number; x: number; y: number }>> = {};
  let snap: number | null = null, thrown: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, target: any, ...rest: any[]) => { if (q === sim.qb && !thrown) thrown = { t: sim.t, slot: target?.slot ?? null }; return tb(q, target, ...rest); };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0();
    if (snap === null && sim.phase !== 'pre' && sim.phase !== 'presnap') snap = sim.qb?.behavior?.snapAt ?? sim.t;
    for (const a of sim.agents) (tr[a.idx] ??= []).push({ t: sim.t, x: a.pos.x, y: a.pos.y });
    if (sim.t > 5) sim.phase = 'dead';
  };
  try { sim.run(); } catch (e) { process.stderr.write(String((e as Error).message).slice(0, 200) + '\n'); }
  const t0s = snap ?? 0;
  const at = (idx: number, t: number) => { const P = tr[idx] ?? []; let best = P[0]; for (const p of P) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p; return best; };
  const numbering: Record<string, string> = sim.offAlign.numbering;
  const recv = Object.entries(numbering).filter(([, s]) => s).map(([ref, slot]) => ({ ref, a: sim.slot(slot) })).filter((r) => r.a);
  const defs = sim.defense as any[];
  const sep = (ra: any, t: number) => r2(Math.min(...defs.map((d) => dist(at(ra.idx, t), at(d.idx, t)))));
  const receivers = recv.map(({ ref, a }) => {
    const route = String(a.behavior?.route?.id ?? a.behavior?.kind ?? '').split(':').pop();
    const brk = a.behavior?.breakAt ?? null;
    return { ref, slot: a.slot, route, sep10: sep(a, t0s + 1.0), sep15: sep(a, t0s + 1.5), sep20: sep(a, t0s + 2.0), sep25: sep(a, t0s + 2.5),
      sepBrk: typeof brk === 'number' ? sep(a, brk) : null };
  });
  const covered = defs.map((d) => {
    const n: Record<string, number> = {};
    for (let t = t0s + 0.5; t <= t0s + 2.0; t += 0.1) {
      let best: string | null = null, bd = 99;
      for (const { ref, a } of recv) { const dd = dist(at(a.idx, t), at(d.idx, t)); if (dd < bd) { bd = dd; best = ref; } }
      if (best && bd < 6) n[best] = (n[best] ?? 0) + 1;
    }
    const top = Object.entries(n).sort((x, y) => y[1] - x[1])[0];
    const spot = sim.defAlign.spots[d.slot];
    const man = spot?.role?.kind === 'man' && spot.manTarget ? Object.entries(numbering).find(([, s]) => s === spot.manTarget)?.[0] ?? null : null;
    let traffic = null as null | { ticks: number; extra: number };
    if (man) {
      const mine = sim.slot(spot.manTarget);
      let ticks = 0;
      for (const p of tr[d.idx] ?? []) {
        if (p.t < t0s || p.t > t0s + 1.5) continue;
        if (sim.offense.some((o: any) => o !== mine && o.slot !== 'QB' && o.idx !== mine?.idx && Math.hypot(at(o.idx, p.t).x - p.x, at(o.idx, p.t).y - p.y) < 1.2)) ticks++;
      }
      const P = (tr[d.idx] ?? []).filter((p) => p.t >= t0s && p.t <= t0s + 1.5);
      let len = 0; for (let k = 1; k < P.length; k++) len += dist(P[k], P[k - 1]);
      const straight = P.length ? dist(P[0], P[P.length - 1]) : 0;
      traffic = { ticks, extra: r2(len - straight) };
    }
    return { slot: d.slot, role: spot?.role?.kind ?? null, man, covered: top ? top[0] : null, traffic };
  });
  // Mesh: how close the two crossers came, and how close each one's man defender came to the other crosser.
  let mesh: any = null;
  const S2 = recv.find((r) => r.ref === 'S2')?.a, W2 = recv.find((r) => r.ref === 'W2')?.a;
  if (S2 && W2) {
    let gap = 99; for (let t = t0s; t <= t0s + 2.5; t += 0.05) gap = Math.min(gap, dist(at(S2.idx, t), at(W2.idx, t)));
    const nearOther = (mine: any, other: any) => {
      const d = defs.find((x) => { const sp = sim.defAlign.spots[x.slot]; return sp?.role?.kind === 'man' && sp.manTarget === mine.slot; });
      if (!d) return null;
      let m = 99; for (let t = t0s; t <= t0s + 2.5; t += 0.05) m = Math.min(m, dist(at(d.idx, t), at(other.idx, t)));
      return r2(m);
    };
    mesh = { gap: r2(gap), s2DefToW2: nearOther(S2, W2), w2DefToS2: nearOther(W2, S2) };
  }
  const ev = sim.events as any[];
  const targetRef = thrown?.slot ? Object.entries(numbering).find(([, s]) => s === thrown.slot)?.[0] ?? null : null;
  console.log(JSON.stringify({ concept, coverage, formation, press: pressArg ?? null, seed, v2: process.env.QB_V2 === '1',
    rel: thrown ? r2(thrown.t - t0s) : null, target: targetRef, complete: !!sim.stats.completed,
    int: ev.some((e) => e.type === 'interception'), sack: ev.some((e) => e.type === 'sack'),
    jams: ev.filter((e) => e.type === 'jam').length, meshGap: MESH_GAP, mesh, receivers, defense: covered }));
}
