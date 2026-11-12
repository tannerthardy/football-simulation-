// The wrap at speed, traced (Integration / Coverage, 2026-11-12: completions give up ~2x the NFL's yards after first
// contact in fast side/rear cells and stay up ~1.4x as long). Every completion: the first grasp on the catcher, its side
// (holder's offset against the carrier's velocity: behind / side / front), the carrier's and holder's speeds then. Kept:
// side or behind with the carrier or the holder at 4+ yd/s. Each 0.05 s from the grasp until the play ends or 2 s:
//   v      the carrier's speed along his heading at the grasp, yd/s
//   share  the speed momentum sharing alone would leave the pair at (mc*vc + mt*vt) / (mc + mt), along that heading
//   vt     the holder's speed along that heading
//   grip   grip force on the carrier along the heading (negative = holding him back), N-ish (kg*yd/s^2); cap = capacity
//   Fc/Ft  the carrier's / holder's other horizontal force along the heading (m*dv/dt minus the grip), kg*yd/s^2:
//          the ground (stride, braking) plus any other contact
//   legs / lock / slip / stride   the grasp's leg share, wrap lock, slipping, stride force it took this substep
//   sup    carrier support state, his COM deviation beyond his base |xi| (yd), COM height (yd); holder's state
// SUMMARY=1: one JSON line per kept play instead (cell, speeds, the share prediction, speed at +0.25 / +0.5 s, the grip at
// capacity share and when it broke, the stride bound, the carrier's and holder's mean other force over the first 0.3 s,
// the holder's state at +0.1 s, the carrier's peak deviation while held, time to the end and yards after the wrap).
// usage: [flags] node --import tsx scripts/diag/effective-mass/finish-trace.mts [seed] [games] [max plays] > out.txt
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, withIdentity } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const seed = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 4), maxPlays = Number(process.argv[4] ?? 10);
const f = (x: number, d = 2) => Number.isFinite(x) ? x.toFixed(d) : '-';
const SUMMARY = process.env.SUMMARY === '1';
const k2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let shown = 0;
for (let g = 0; g < games && shown < maxPlays; g++) {
  simulateGame(withIdentity(home, seed + g), withIdentity(away, seed + g), { seed: seed + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass || shown >= maxPlays) return undefined;
    let rec: any = null; const lines: string[] = []; let next = 0; let prev: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      const c = sim.carrier; if (!c || c === sim.qb || sim.throwAt < 0) return;
      if (!rec) {
        const j = sim.world.joints.find((j: any) => j.kind === 'grasp' && !j.broken && j.b === c.body);
        if (!j) return;
        const t = sim.agents.find((x: any) => x.body === j.a); if (!t) return;
        const vc = Math.hypot(c.vel.x, c.vel.y), vt0 = Math.hypot(t.vel.x, t.vel.y);
        const h = vc > 0.5 ? { x: c.vel.x / vc, y: c.vel.y / vc } : { x: sim.attackDir(c.team), y: 0 };
        const rx = t.pos.x - c.pos.x, ry = t.pos.y - c.pos.y, cos = (rx * h.x + ry * h.y) / (Math.hypot(rx, ry) || 1);
        const side = cos > Math.SQRT1_2 ? 'front' : cos < -Math.SQRT1_2 ? 'behind' : 'side';
        if (side === 'front' || (vc < 4 && vt0 < 4)) { rec = { skip: true }; return; }
        const mc = c.body.profile.massKg, mt = t.body.profile.massKg;
        const along = (v: any) => v.x * h.x + v.y * h.y;
        rec = { j, t, h, mc, mt, t0: sim.t, x0: along(c.pos), x0x: c.pos.x, side, vc0: vc, vt0, vtAlong: along(t.vel), share: (mc * along(c.vel) + mt * along(t.vel)) / (mc + mt),
          legs0: j.legs, lock0: j.lock ?? 0, cap0: j.capacity, origin: j.origin ?? '', v25: NaN, v50: NaN, atCap: 0, n30: 0, brokeAt: null as number | null,
          stride: 0, Fc30: 0, Ft30: 0, nF: 0, holder10: null as string | null, xiMax: 0, holdersMax: 1, carrierPos: c.player.position, holderPos: t.player.position };
        lines.push(`play g${g} t${f(sim.t)}: ${side} wrap, carrier ${c.player.position} ${f(mc, 0)} kg at ${f(vc)} yd/s, holder ${t.player.position} ${f(mt, 0)} kg at ${f(vt0)} yd/s (along ${f(along(t.vel))}); momentum share -> ${f(rec.share)} yd/s | legs ${f(j.legs)} lock ${f(j.lock ?? 0)} cap ${f(j.capacity, 0)} origin ${j.origin ?? ''}`);
      }
      if (rec.skip) return;
      if (c !== sim.agents.find((x: any) => x.body === rec.j.b)) return;
      rec.lastX = c.pos.x;
      if (sim.t + 1e-9 < next || sim.t - rec.t0 > 2) return; next = sim.t + 0.05;
      const { j, t, h, mc, mt } = rec, along = (v: any) => v.x * h.x + v.y * h.y;
      const vc = along(c.vel), vt = along(t.vel);
      const fb = j.broken ? 0 : along({ x: (j.normalForceOnB?.x ?? 0) + (j.tangentForceOnB?.x ?? 0), y: (j.normalForceOnB?.y ?? 0) + (j.tangentForceOnB?.y ?? 0) });
      let Fc = NaN, Ft = NaN;
      if (prev) { const dt = sim.t - prev.t; Fc = mc * (vc - prev.vc) / dt - fb; Ft = mt * (vt - prev.vt) / dt + fb; }
      prev = { t: sim.t, vc, vt };
      const el = sim.t - rec.t0;
      if (Number.isNaN(rec.v25) && el >= 0.25 - 1e-6) rec.v25 = vc;
      if (Number.isNaN(rec.v50) && el >= 0.5 - 1e-6) rec.v50 = vc;
      if (el <= 0.3 + 1e-6) { rec.n30++; if (j.slipping && !j.broken) rec.atCap++; if (Number.isFinite(Fc)) { rec.Fc30 += Fc; rec.Ft30 += Ft; rec.nF++; } }
      if (j.broken && rec.brokeAt === null) rec.brokeAt = el;
      rec.stride = Math.max(rec.stride, sim.world.strideHolds?.[sim.world.indexOf(c.body)] ?? 0);
      if (rec.holder10 === null && el >= 0.1 - 1e-6) rec.holder10 = t.body.support?.state;
      rec.xiMax = Math.max(rec.xiMax, Math.hypot(c.body.support?.xi?.x ?? 0, c.body.support?.xi?.y ?? 0));
      const s = c.body.support, ts = t.body.support, i = sim.world.indexOf(c.body);
      const req = sim.intents?.[t.idx]?.vel, reqT = req ? along(req) : NaN, reqC = sim.intents?.[c.idx]?.vel ? along(sim.intents[c.idx].vel) : NaN;
      // Ground impulse on each body this tick (the World's report), as a force along the heading.
      const rep = (sim.world as any).report, ic = sim.world.indexOf(c.body), it = sim.world.indexOf(t.body), tdt = (sim.world as any).tickDt || sim.dt;
      const gC = rep?.groundImpulse?.[ic] ? along(rep.groundImpulse[ic]) / tdt : NaN, gT = rep?.groundImpulse?.[it] ? along(rep.groundImpulse[it]) / tdt : NaN;
      if (el <= 0.3 + 1e-6 && Number.isFinite(gC)) { rec.gC = (rec.gC ?? 0) + gC; rec.gT = (rec.gT ?? 0) + gT; rec.nG = (rec.nG ?? 0) + 1; }
      if (el > 0.3 && el <= 0.8 + 1e-6 && Number.isFinite(gC)) { rec.gC2 = (rec.gC2 ?? 0) + gC; rec.gT2 = (rec.gT2 ?? 0) + gT; rec.nG2 = (rec.nG2 ?? 0) + 1; }
      // The pair's momentum along the heading: its change is the ground (and any third body) on both.
      const P = mc * vc + mt * vt;
      if (rec.P0 === undefined) rec.P0 = P;
      if (rec.P30 === undefined && el >= 0.3 - 1e-6) { rec.P30 = P; rec.vc30 = vc; rec.vtA30 = vt; rec.h30 = t.body.support?.state; rec.c30 = c.body.support?.state; }
      const lun = sim.intents?.[t.idx]?.lunge, stk = t.body.support?.strike;
      if (el <= 0.3 + 1e-6) { const tx = t.body.support?.xi; if (tx) rec.xiT30 = Math.max(rec.xiT30 ?? 0, along(tx)); rec.postT = sim.intents?.[t.idx]?.posture ?? rec.postT; if (t.body.support?.state !== 'up' && rec.tFall === undefined) rec.tFall = el; }
      if (el <= 0.3 + 1e-6) { rec.nL = (rec.nL ?? 0) + 1; rec.lungeTicks = (rec.lungeTicks ?? 0) + (lun && Math.hypot(lun.x, lun.y) > 1e-6 ? 1 : 0);
        rec.lungeAlong = (rec.lungeAlong ?? 0) + (lun ? along(lun) : 0); rec.strikeAlong = (rec.strikeAlong ?? 0) + (stk ? along(stk) : 0); }
      if (el <= 0.3 + 1e-6 && Number.isFinite(reqT)) { rec.reqT30 = (rec.reqT30 ?? 0) + reqT; rec.nReq = (rec.nReq ?? 0) + 1; rec.vt30 = (rec.vt30 ?? 0) + vt; }
      const com = (sim.world as any).comHeight?.[i];
      const holders = new Set(sim.world.joints.filter((x: any) => x.kind === 'grasp' && !x.broken && x.b === c.body).map((x: any) => x.a)).size;
      rec.holdersMax = Math.max(rec.holdersMax, holders);
      // The holder's fall (HANG_AIRBORNE question): his grip as it starts, whether the stride binds and whether the grip
      // tears while he is falling.
      if (t.body.support?.state === 'falling' && !j.broken) {
        if (!rec.fall) rec.fall = { at: k2(el), lock: k2(j.lock ?? 0), legs: k2(j.legs), oneArm: sim.bond?.oneArm?.has?.(t) ?? false, bound: 0, tore: false, x0: along(c.pos) };
        rec.fall.bound = Math.max(rec.fall.bound, sim.world.strideHolds?.[sim.world.indexOf(c.body)] ?? 0);
      } else if (rec.fall && rec.fall.end === undefined) {
        rec.fall.end = k2(el); rec.fall.tore = !!j.broken && t.body.support?.state !== 'down'; rec.fall.dist = k2(along(c.pos) - rec.fall.x0);
      }
      // Census snapshots at the grasp, +0.3 and +0.6 s: where and how he holds, what his body does, what the carrier carries.
      for (const T of [0, 0.3, 0.6]) if (!(rec.snap ??= {})[T] && el >= T - 1e-6) {
        const sh = sim.world.indexOf(c.body), bonded = sim.bond?.oneArm?.has?.(t) ?? false;
        rec.snap[T] = { legs: k2(j.legs), lock: k2(j.lock ?? 0), height: k2(j.height ?? NaN), oneArm: bonded, broken: !!j.broken,
          hState: t.body.support?.state, hRatio: k2(vc > 0.5 ? vt / vc : NaN), hGround: k2(gT), drag: k2(fb), cGround: k2(gC),
          stride: k2(sim.world.strideHolds?.[sh] ?? 0), cXi: k2(Math.hypot(s?.xi?.x ?? 0, s?.xi?.y ?? 0)), cState: s?.state, holders };
      }
      lines.push(`  +${f(sim.t - rec.t0)} gained ${f(along(c.pos) - rec.x0)} | v ${f(vc)} (asks ${f(reqC)}) vt ${f(vt)} (asks ${f(reqT)}) | grip ${f(fb, 0)} cap ${f(j.capacity, 0)} | ground C ${f(gC, 0)} T ${f(gT, 0)} | legs ${f(j.legs)} lock ${f(j.lock ?? 0)} slip ${j.slipping ? 1 : 0} stride ${f(j.strideForce ?? 0, 0)} ${j.broken ? 'BROKEN' : ''} | holders ${holders} | sup ${s?.state} xi ${f(Math.hypot(s?.xi?.x ?? 0, s?.xi?.y ?? 0))} com ${f(com)} | holder ${ts?.state} xi ${f(Math.hypot(ts?.xi?.x ?? 0, ts?.xi?.y ?? 0))} xi-along ${f(ts?.xi ? along(ts.xi) : NaN)} posture ${f(ts?.posture ?? NaN)}`);
    };
    const res = sim.run();
    if (rec && !rec.skip) {
      shown++;
      const dir = sim.attackDir(sim.offense[0].team);
      const after = rec.lastX !== undefined ? (rec.lastX - rec.x0x) * dir : NaN;
      if (SUMMARY) { const { j, t, h, ...r } = rec; const k = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
        console.log(JSON.stringify({ g, side: r.side, cpos: r.carrierPos, hpos: r.holderPos, mc: k(r.mc), mt: k(r.mt), pc: k(rec.j.b.profile.power ?? NaN), pt: k(rec.j.a.profile.power ?? NaN), tackling: k(rec.t.r?.('tackling') ?? NaN), vc0: k(r.vc0), vt0: k(r.vt0), vtAlong: k(r.vtAlong), share: k(r.share), v25: k(r.v25), v50: k(r.v50),
          legs0: k(r.legs0), lock0: k(r.lock0), cap0: k(r.cap0), origin: r.origin, atCap30: k(r.atCap / Math.max(1, r.n30)), brokeAt: r.brokeAt === null ? null : k(r.brokeAt), stride: k(r.stride),
          Fc30: k(r.Fc30 / Math.max(1, r.nF)), Ft30: k(r.Ft30 / Math.max(1, r.nF)), snap: rec.snap ?? null, fall: rec.fall ? { ...rec.fall, bound: k2(rec.fall.bound) } : null, xiT30: k(rec.xiT30 ?? NaN), postureAsked: k(rec.postT ?? NaN), holderFell30: rec.tFall ?? null, groundC30: k((rec.gC ?? NaN) / (rec.nG ?? 1)), groundT30: k((rec.gT ?? NaN) / (rec.nG ?? 1)), groundC80: k((rec.gC2 ?? NaN) / (rec.nG2 ?? 1)), groundT80: k((rec.gT2 ?? NaN) / (rec.nG2 ?? 1)), lungeShare30: k((rec.lungeTicks ?? 0) / Math.max(1, rec.nL ?? 0)), lungeAlong30: k((rec.lungeAlong ?? 0) / Math.max(1, rec.nL ?? 0)), strikeAlong30: k((rec.strikeAlong ?? 0) / Math.max(1, rec.nL ?? 0)), pairForce30: k(rec.P30 !== undefined ? (rec.P30 - rec.P0) / 0.3 : NaN), vc30: k(rec.vc30 ?? NaN), vtA30: k(rec.vtA30 ?? NaN), h30: rec.h30 ?? null, c30: rec.c30 ?? null, reqT30: k((r.reqT30 ?? NaN) / (r.nReq ?? 1)), vt30: k((r.vt30 ?? NaN) / (r.nReq ?? 1)), holder10: r.holder10, xiMax: k(r.xiMax), holdersMax: r.holdersMax, dur: k(sim.t - r.t0), after: k(after), outcome: res?.outcome ?? null })); }
      else { console.log(lines.join('\n')); console.log(`  end ${res?.outcome ?? ''} after ${f(sim.t - rec.t0)} s, yards after the wrap ${f(after)}\n`); } }
    return res; } } });
}
