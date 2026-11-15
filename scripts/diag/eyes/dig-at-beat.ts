// CONCEPT_DROPS=1 PLAN_CLOCK=1 QB_TICK_PICTURE=1 QB_FOOTWORK=1 node --import tsx scripts/diag/eyes/dig-at-beat.ts keys.json > rows.jsonl
// Integration's dagger question (2026-11-15): on the plays QB_FOOTWORK bit 1 newly sacks, while his read is the dig,
// what does his window price it at for the ball's arrival, against his bar, and who closes it? keys.json: a list of
// [coverage, roster, seed, formation]. Per tick while the dig is his read (the route id `dig`): his readiness, the
// evaluation (P, pick risk, parts, flight, arrival point), his bar (barNow), the top two defenders of his margin trace
// (by contest), and then, from the same run, where those defenders and the dig truly were at the ball's arrival
// (separation of the nearest defender at that time). Also the moment his eyes leave the dig. Passive: evaluate's own
// margin probe and a wrapper; nothing extra is called.
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const keys: [string, number, number, string][] = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const [coverage, roster, seed, formation] of keys) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'dagger', seed, roster, formation, flip: false }));
  const qb: any = sim.qb.behavior; qb.marginProbe = true;
  const dig = sim.offense.find((o: any) => (o.behavior?.route?.id ?? o.behavior?.fallback?.route?.id) === 'dig');
  if (!dig) continue;
  const looks: any[] = [], pos: Record<number, Record<string, [number, number]>> = {};
  let left: number | null = null, onDig = false, sackT: number | null = null; const snaps: any = {};
  const ev0 = qb.evaluate;
  qb.evaluate = function (...args: any[]) {
    const r = ev0.apply(this, args);
    if (args[2] === dig && qb.reads?.[qb.readIdx] === dig) {
      const wind = qb.windup(sim.qb);
      const top = (qb.marginLast ?? []).slice().sort((x: any, y: any) => y.contest - x.contest).slice(0, 2).map((m: any) => ({ slot: m.slot, m: m.m, contest: m.contest, sepSeen: m.sepSeen, age: m.age }));
      looks.push({ t: +sim.t.toFixed(2), ready: null, u: +(args[3] ?? 0).toFixed(2), P: r ? +r.P.toFixed(3) : null, int: r ? +r.intRisk.toFixed(3) : null,
        parts: r?.parts ? Object.fromEntries(Object.entries(r.parts).map(([k, v]: any) => [k, +(+v).toFixed(3)])) : null,
        arrive: r ? +(sim.t + wind + r.T).toFixed(2) : null, pt: r ? { x: +r.point.x.toFixed(1), y: +r.point.y.toFixed(1) } : null,
        bar: qb.barNow ? { thr: +qb.barNow.thr.toFixed(3), maxInt: +qb.barNow.maxInt.toFixed(3) } : null, top,
        onStep: qb.onStep ? qb.onStep(sim.qb, dig, args[3] ?? 0) : null, landed: qb.landedSteps ?? null, need: qb.stepOf?.get(dig)?.n ?? null,
        step: qb.step ? { n: qb.step.n, since: +qb.step.since.toFixed(2), landed: qb.step.landed, left: +Math.hypot(qb.step.to.x - sim.qb.pos.x, qb.step.to.y - sim.qb.pos.y).toFixed(2) } : null });
    }
    return r;
  };
  const sif = qb.startIfFinish.bind(qb), calls: any[] = [];
  qb.startIfFinish = (a: any, s: any, ev: any) => {
    const r = sif(a, s, ev);
    if (ev?.target === dig) calls.push({ t: +sim.t.toFixed(2), started: !!r, confirm: !!(qb.confirm && sim.t < qb.confirm.until), look: !!qb.look, P: +ev.P.toFixed(3) });
    return r;
  };
  const st0 = qb.startThrow.bind(qb), starts: any[] = [];
  qb.startThrow = (a: any, s: any, ev: any) => { starts.push({ t: +sim.t.toFixed(2), to: ev?.target?.slot, P: +(ev?.P ?? 0).toFixed(3) }); return st0(a, s, ev); };
  const pd = qb.pullDown?.bind(qb), pulls: any[] = [];
  if (pd) qb.pullDown = (a: any, s: any, ev: any) => { const r = pd(a, s, ev); if (r) pulls.push({ t: +sim.t.toFixed(2), to: ev?.target?.slot }); return r; };
  for (let i = 0; i < 700 && sim.phase === 'live'; i++) {
    sim.tick();
    const k = Math.round(sim.t * 20);
    pos[k] = Object.fromEntries([...sim.defense, dig].map((d: any) => [d === dig ? 'DIG' : d.slot, [d.pos.x, d.pos.y]]));
    const now = qb.reads?.[qb.readIdx] === dig && sim.qb.behavior === qb;
    for (const tt of [2.0, 2.5, 3.0, 3.5]) if (Math.abs(sim.t - tt) < sim.dt / 2 && sim.carrier === sim.qb) {
      const dir = sim.attackDir(sim.qb.team), near = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y)));
      (snaps as any)[tt] = { x: +((sim.qb.pos.x - sim.los) * dir).toFixed(2), near: +near.toFixed(2), readIdx: qb.readIdx, phase: qb.phase };
    }
    if (onDig && !now && left === null) left = +sim.t.toFixed(2);
    onDig = now;
    if (sim.qb.behavior !== qb && sim.carrier === sim.qb && sackT === null && sim.phase !== 'live') sackT = +sim.t.toFixed(2);
  }
  // Truth at the ball's arrival: the nearest defender to the dig then (if the play lasted that long).
  for (const l of looks) {
    const p = l.arrive !== null ? pos[Math.round(l.arrive * 20)] : undefined;
    if (!p) { l.trueSepAtArrival = null; continue; }
    const [dx, dy] = p.DIG;
    let best = Infinity, who = '';
    for (const [s, [x, y]] of Object.entries(p)) if (s !== 'DIG') { const d = Math.hypot(x - dx, y - dy); if (d < best) { best = d; who = s; } }
    l.trueSepAtArrival = +best.toFixed(1); l.trueNearest = who;
    l.topTrue = l.top.map((m: any) => { const q = p[m.slot]; return q ? { slot: m.slot, dist: +Math.hypot(q[0] - dx, q[1] - dy).toFixed(1) } : null; });
  }
  console.log(JSON.stringify({ key: [coverage, roster, seed, formation], setAt: qb.setAt, snaps, left, calls, starts, pulls, ev: sim.events.filter((e: any) => ['pump', 'throw_held', 'sack', 'throw', 'pass', 'release'].includes(e.type)).map((e: any) => [e.type, +e.t.toFixed(2)]), types: [...new Set(sim.events.map((e: any) => e.type))], looks, sacked: !!sim.result?.stats?.sacked }));
}
