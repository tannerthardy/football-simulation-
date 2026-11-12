/**
 * Looked-at declines (Integration's caution on declined-risky.ts: a forced throw to a read he is not looking at is
 * also an unlooked throw, and zone defenders read his eyes). On the forced-concept panel: every tick his eyes are on a
 * ready read (the read he is on, `reads[readIdx]`, which is what his eyes and facing show the defense) and he
 * evaluates it without throwing it, the first such tick per read is a decline he made while looking. Each is re-run:
 * the same play (deterministic setup) with that throw started at that tick (his own evaluation, his own release). Records
 * his P, intRisk and its parts for it, the bar he held it to (thr, maxInt), and what happened (completion, INT, yards),
 * beside the play as it went. For the catch-point arrival question, also each defender's believed arrival margin at the
 * aimed point (`m`, from the window; negative = he believes the defender is there first) and, in the forced re-run, the
 * time that defender actually came within reach + 0.3 yd of the ball, relative to the ball's arrival. Passive except
 * for the forced re-runs.
 *   node --import tsx scripts/diag/read-plan/declined-looked.ts [--seeds 1,2] > out/read-plan/declined-looked.jsonl
 */
import { MENU_CONCEPTS, PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seeds = arg('--seeds', '1,2').split(',').map(Number);
/** --commit: the forced throw skips the plant re-check (no pull-down), so it is the throw he evaluated. */
const COMMIT = process.argv.includes('--commit');
const concepts = [...Object.values(PASS_BY_ID).filter((c) => !MENU_CONCEPTS.includes(c)), ...MENU_CONCEPTS];
const P: any = QBPass.prototype, ev0 = P.evaluate, st = P.startThrow;
let mode: 'natural' | 'force' = 'natural';
let looks: Map<string, any> = new Map(), thrownAt: number | null = null;
P.evaluate = function (a: any, sim: any, r: any, u: number) {
  this.marginProbe = true;
  const e = ev0.call(this, a, sim, r, u);
  if (mode === 'natural' && e && thrownAt === null && r === this.reads?.[this.readIdx] && sim.qbEyes === r && !looks.has(r.slot) && this.barNow?.t === sim.t) {
    looks.set(r.slot, { t: sim.t, slot: r.slot, P: +e.P.toFixed(3), intRisk: +e.intRisk.toFixed(4), parts: e.parts, thr: +this.barNow.thr.toFixed(3), maxInt: +this.barNow.maxInt.toFixed(3), margins: this.marginLast });
  }
  return e;
};
P.startThrow = function (a: any, sim: any, e: any) {
  if (mode === 'natural' && thrownAt === null) { thrownAt = sim.t; looks.delete(e.target.slot); }
  return st.call(this, a, sim, e);
};
const play = (setup: any, force: { t: number; slot: string } | null) => {
  const sim: any = new PlaySim(nativeTraceSetup(setup));
  let forced = false, arrive: number | null = null, point: any = null;
  const first: Map<string, number> = new Map(), minD: Map<string, number> = new Map(), atArr: Map<string, number> = new Map();
  let pic: any = null, aim: any = null, relT: number | null = null, relTarget: string | null = null, pumps = 0;
  const onBall: Map<string, number> = new Map();
  let deflAt: number | null = null, intAt: number | null = null, picker: string | null = null, wasAir = false;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const qb = sim.qb.behavior;
    if (force && !forced && qb?.kind === 'qb-pass' && Math.abs(sim.t - force.t) < 1e-6 && sim.throwAt < 0) {
      const r = sim.offense.find((o: any) => o.slot === force.slot), e = r && qb.evaluate(sim.qb, sim, r, 0);
      if (e) {
        forced = true; if (COMMIT) qb.rechecked = true; point = e.point;
        pic = Object.fromEntries(sim.defense.map((d: any) => { const s = qb.mind.estimate(d);
          return [d.slot, { picErr: +Math.hypot(s.pos.x - d.pos.x, s.pos.y - d.pos.y).toFixed(2), velErr: +Math.hypot(s.vel.x - d.vel.x, s.vel.y - d.vel.y).toFixed(2),
            age: +(qb.mind.pictureAge?.(d) ?? -1).toFixed(2), kind: d.behavior?.kind ?? null, dist0: +Math.hypot(d.pos.x - point.x, d.pos.y - point.y).toFixed(2) }]; }));
        qb.startThrow(sim.qb, sim, e);
        if (COMMIT) qb.rechecked = true;
      }
    }
    tick();
    if (forced && sim.ball?.kind === 'air' && arrive === null && sim.ball.arrivalT) { arrive = sim.ball.arrivalT; relT = sim.t; relTarget = sim.ball.target?.slot ?? null; aim = sim.ball.intended; }
    if (forced && relT !== null) {
      if (sim.ball.kind === 'air' && sim.ball.deflected && deflAt === null) deflAt = sim.t;
      if (intAt === null && wasAir && sim.ball.kind !== 'air' && sim.possession === 'D') { intAt = sim.t; picker = sim.ball.carrier?.slot ?? null; }
      wasAir = sim.ball.kind === 'air';
    }
    if (relT !== null) for (const d of sim.defense) if (!onBall.has(d.slot) && d.tags.has('onBall')) onBall.set(d.slot, +(sim.t - relT).toFixed(2));
    // Against the aim as released (re-aimed at the release), from the release on.
    if (forced && aim) for (const d of sim.defense) {
      const dd = Math.hypot(d.pos.x - aim.x, d.pos.y - aim.y);
      minD.set(d.slot, Math.min(minD.get(d.slot) ?? 99, dd));
      if (arrive !== null && !atArr.has(d.slot) && sim.t >= arrive - 1e-9) atArr.set(d.slot, dd);
      if (!first.has(d.slot) && dd < d.profile.reach + 0.3) first.set(d.slot, sim.t);
    }
  };
  const res = sim.run(), s = sim.stats;
  pumps = res.events.filter((x: any) => x.type === 'pump').length;
  return { cmp: !!s.completed, int: res.events.some((x: any) => x.type === 'interception'), yards: +res.yards.toFixed(2), sack: !!s.sacked, forced,
    defArrive: arrive === null ? null : Object.fromEntries([...first].map(([k, v]) => [k, +(v - arrive!).toFixed(2)])),
    defMin: Object.fromEntries([...minD].map(([k, v]) => [k, +v.toFixed(2)])), defAtArr: Object.fromEntries([...atArr].map(([k, v]) => [k, +v.toFixed(2)])), pic, onBall: Object.fromEntries(onBall), wind: relT === null ? null : +(relT - force!.t).toFixed(2), relTarget, pumps,
    intKind: intAt === null ? null : deflAt !== null && deflAt <= intAt ? 'tipped' : arrive !== null && intAt < arrive - 0.15 ? 'path' : 'catch point',
    intEarly: intAt !== null && arrive !== null ? +(arrive - intAt).toFixed(2) : null, picker };
};
for (const c of concepts) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const seed of seeds) {
  const setup = { coverage, concept: c.id, seed, roster: seed, formation, flip: false };
  mode = 'natural'; looks = new Map(); thrownAt = null;
  const nat = play(setup, null);
  const declines = [...looks.values()].filter((l) => thrownAt === null || l.t <= thrownAt);
  mode = 'force';
  for (const D of declines) {
    const out = play(setup, { t: D.t, slot: D.slot });
    if (!out.forced) continue;
    process.stdout.write(JSON.stringify({ concept: c.id, formation, coverage, seed, natural: { thrownAt, ...nat, defArrive: undefined },
      declined: { ...D, cmp: out.cmp, int: out.int, yards: out.yards, sack: out.sack, defArrive: out.defArrive, defMin: out.defMin, defAtArr: out.defAtArr, pic: out.pic, onBall: out.onBall, windActual: out.wind, relTarget: out.relTarget, pumps: out.pumps, intKind: out.intKind, intEarly: out.intEarly, picker: out.picker } }) + '\n');
  }
}
