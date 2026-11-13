/** Pursuit planner, sim side (Defense, report only): what each pursuing defender asks for and what he achieves in
 * the open field, the switch to the close gather / held tackle / dive, and the spread by his pursuit rating.
 * Open field: from the catch, or the first tick a run's carrier is past the line. Every tick each defender whose
 * pursuit trace fired (chase / intercept) and who is 1-25 yd from the carrier is sampled:
 *   - geometry ahead / level / trailing and distance band (as pursuit.py);
 *   - requested and achieved aim (angle off the line to the carrier, + toward the carrier's heading) and speed;
 *   - his stage (intercept-sprint, around-bodies, close-gather, held-tackle; dive / lunge from his intent).
 * Switches: distance and speed when he first enters close-gather and when he first dives. Rating split: pursuit
 * rating terciles over the defenders sampled: aim p50 by geometry and reach within 1 yd.
 * usage: node --import tsx scripts/diag/effective-mass/pursuit-planner.mts [games] [seed] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 8), seed0 = Number(process.argv[3] ?? 101);
const stageOf = new WeakMap<any, string>(); const ipOf = new WeakMap<any, number>(); const fcOf = new WeakMap<any, any>(); const pend: any[] = []; const fcErr: any[] = []; const recede: any[] = []; const feas: any[] = [];
const tc0 = PlaySim.prototype.commandTraceFor;
PlaySim.prototype.commandTraceFor = function (this: any, a: any) {
  const inner = tc0.call(this, a) as any;
  return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
    ? (t: any, d: any) => { if (d?.kind === 'intercept') { ipOf.set(a, d.prediction?.t); fcOf.set(a, d); } stageOf.set(a, d?.kind === 'chase' ? (d.requests?.at(-1)?.stage ?? 'chase') : 'intercept'); return o?.pursuit?.(t, d); }
    : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }) as any;
};
const rows: any[] = []; const gathers: any[] = []; const dives: any[] = []; const reach: any[] = [];
const signed = (vx: number, vy: number, dx: number, dy: number, side: number) => {
  const L = Math.hypot(dx, dy) || 1; return Math.atan2((-vx * dy + vy * dx) / L, (vx * dx + vy * dy) / L) * 180 / Math.PI * side;
};
const tick0 = PlaySim.prototype.tick;
const St = new WeakMap<any, any>();
PlaySim.prototype.tick = function (this: any) {
  const sim = this;
  for (const a of sim.agents) stageOf.delete(a);
  tick0.call(this);
  let s = St.get(sim); if (!s) { s = { t0: -1, c: null, seen: new Map() }; St.set(sim, s); }
  for (let i = pend.length - 1; i >= 0; i--) { const P = pend[i]; if (sim.t < P.due) continue; pend.splice(i, 1);
    if (sim.ball.kind !== 'held' || sim.ball.carrier !== P.c) continue;
    const f = P.f, tt = 0.6 + (P.obs.age ?? 0), sp = f.initialSpeed, V = f.relaxedSpeed, ta = f.relaxationTime;
    const dd = V * tt - (V - sp) * ta * (1 - Math.exp(-tt / ta));
    const px = P.obs.pos.x + f.heading.x * dd, py = P.obs.pos.y + f.heading.y * dd;
    const ex = P.c.pos.x - px, ey = P.c.pos.y - py;
    fcErr.push({ geo: P.geo, kind: P.kind, along: ex * f.heading.x + ey * f.heading.y, across: Math.hypot(ex, ey), own: Math.hypot(P.d.vel.x, P.d.vel.y) - P.ownPred, ownNow: P.ownNow, ownPred: P.ownPred, ownAct: Math.hypot(P.d.vel.x, P.d.vel.y), req: P.req }); }
  if (sim.phase !== 'live') return;
  const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  if (!c || c.team !== 'O') return;
  if (s.t0 < 0) {
    const open = sim.offCall?.kind === 'pass' ? c !== sim.qb : c.pos.x > sim.los;
    if (!open) return;
    s.t0 = sim.t; s.c = c;
  }
  if (c !== s.c || sim.t - s.t0 > 3.0) return;
  const cvx = c.vel.x, cvy = c.vel.y, cs = Math.hypot(cvx, cvy);
  for (const d of sim.defense) {
    const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dist = Math.hypot(dx, dy);
    let S = s.seen.get(d);
    if (!S) { S = { start: dist, gather: false, dive: false, reached: null, pursuit: d.r('pursuit'), geo: null }; s.seen.set(d, S); reach.push(S); }
    if (S.reached === null && dist <= 1) S.reached = sim.t - s.t0;
    const stage = stageOf.get(d); if (!stage || dist < 1 || dist > 25 || cs < 1) continue;
    const bear = Math.acos(Math.max(-1, Math.min(1, (-dx * cvx - dy * cvy) / (dist * cs)))) * 180 / Math.PI;
    const geo = bear < 60 ? 'ahead' : bear <= 120 ? 'level' : 'trailing';
    if (!S.geo) S.geo = geo;
    const side = (-cvx * dy + cvy * dx) / dist >= 0 ? 1 : -1;
    const it = sim.intents?.[d.idx]; if (!it) continue;
    const rq = Math.hypot(it.vel.x, it.vel.y), ac = Math.hypot(d.vel.x, d.vel.y);
    const dive = !!(it.dive || it.lunge);
    const prevReq = S.lastReq, prevAc = S.lastAc; S.lastReq = Math.atan2(it.vel.y, it.vel.x); S.lastAc = Math.atan2(d.vel.y, d.vel.x);
    const wrap = (x: number) => Math.abs(((x * 180 / Math.PI) + 540) % 360 - 180);
    const reqRate = prevReq !== undefined && rq > 1 ? wrap(S.lastReq - prevReq) / sim.dt : NaN;
    const acRate = prevAc !== undefined && ac > 1 ? wrap(S.lastAc - prevAc) / sim.dt : NaN;
    const lag = rq > 1 && ac > 1 ? wrap(S.lastReq - S.lastAc) : NaN;
    const fc = fcOf.get(d);
    if (fc && sim.t - (S.lastFc ?? -9) > 0.25) { S.lastFc = sim.t; const P = d.profile, u0 = ac, vm = P.vmax * d.speedScale;
      pend.push({ due: sim.t + 0.6, c, d, geo, kind: sim.offCall?.kind, pt: fc.forecast && { x: fc.observed.pos.x + fc.forecast.heading.x, y: 0 },
        f: fc.forecast, obs: fc.observed, ownPred: vm - (vm - u0) * Math.exp(-0.6 / P.tau), ownNow: u0, req: rq }); }
    const ipt = ipOf.get(d);
    if (ipt !== undefined) { (S.ips ??= []).push([sim.t, ipt, geo, sim.offCall?.kind]); feas.push({ geo, kind: sim.offCall?.kind, ok: fc?.prediction?.estimate?.status === 'estimated-feasible', h: fc?.prediction?.estimate?.horizon }); }
    const pv = S.lastVel; S.lastVel = { ...d.vel };
    let anShare = NaN, atShare = NaN;
    if (pv && ac > 1) { const ux = d.vel.x / ac, uy = d.vel.y / ac, axv = (d.vel.x - pv.x) / sim.dt, ayv = (d.vel.y - pv.y) / sim.dt;
      const an = Math.abs(-axv * uy + ayv * ux), at = axv * ux + ayv * uy, P = d.profile;
      const cs = it.cutSkill ?? 1, An = P.lateral * cs * (1 - 0.2 * Math.min(1, ac / P.vmax));
      anShare = an / An; atShare = at; }
    rows.push({ anShare, atShare, reqRate, acRate, lag, kind: sim.offCall?.kind, geo, band: dist < 5 ? '2-5' : dist < 10 ? '5-10' : '10-25', dist, rq, ac, stage: dive ? 'dive/lunge' : stage, pursuit: d.r('pursuit'),
      reqAim: rq > 0.5 ? signed(it.vel.x, it.vel.y, dx, dy, side) : NaN, acAim: ac > 0.5 ? signed(d.vel.x, d.vel.y, dx, dy, side) : NaN });
    if (stage === 'close-gather' && !S.gather) { S.gather = true; gathers.push({ dist, ac, rq }); }
    if (dive && !S.dive) { S.dive = true; dives.push({ dist, ac }); }
  }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const q = (v: number[], f = (x: number) => x.toFixed(0)) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length < 5 ? '-' : [.25, .5, .75].map(p => f(w[Math.floor(p * (w.length - 1))])).join('/'); };
console.log(`pursuit planner (${games} games from ${seed0}): samples ${rows.length}`);
console.log('  requested vs achieved aim (deg ahead of the man) and speed, p25/p50/p75; stage mix');
for (const kind of ['run', 'pass']) for (const geo of ['ahead', 'level', 'trailing']) for (const band of ['2-5', '5-10', '10-25']) {
  const X = rows.filter(r => r.kind === kind && r.geo === geo && r.band === band); if (X.length < 40) continue;
  const m: Record<string, number> = {}; for (const r of X) m[r.stage] = (m[r.stage] ?? 0) + 1;
  console.log(`    ${kind.padEnd(4)} ${geo.padEnd(8)} ${band.padEnd(5)} n ${String(X.length).padStart(5)}: aim req ${q(X.map(r => r.reqAim))} ach ${q(X.map(r => r.acAim))} | speed req ${q(X.map(r => r.rq), v => v.toFixed(1))} ach ${q(X.map(r => r.ac), v => v.toFixed(1))} | `
    + Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${(100 * v / X.length).toFixed(0)}%`).join(', '));
}
for (const kind of ['run', 'pass']) for (const geo of ['level', 'trailing']) {
  const X = rows.filter(r => r.kind === kind && r.geo === geo && r.band !== '2-5');
  console.log(`  ${kind} ${geo} 5-25 yd: lateral accel / his cut envelope ${q(X.map(r => r.anShare), v => v.toFixed(2))}, along-track accel ${q(X.map(r => r.atShare), v => v.toFixed(1))} yd/s2, lat ${q(X.map(r=>r.lat??NaN),v=>v.toFixed(1))}`);
  console.log(`  ${kind} ${geo} 5-25 yd: requested heading turns ${q(X.map(r => r.reqRate))} deg/s, body heading turns ${q(X.map(r => r.acRate))} deg/s, request-body angle ${q(X.map(r => r.lag))} deg`);
}
for (const S of reach) { const P = S.ips ?? []; for (let i = 0, j = 0; i < P.length; i++) { while (j < P.length && P[j][0] < P[i][0] + 0.5) j++; if (j < P.length && P[j][0] - P[i][0] < 0.6 && P[i][1] > 0.6) recede.push({ geo: P[i][2], kind: P[i][3], slope: (P[j][1] - P[i][1]) / (P[j][0] - P[i][0]), t: P[i][1] }); } }
for (const kind of ['run', 'pass']) for (const geo of ['ahead', 'level', 'trailing']) { const X = recede.filter(r => r.kind === kind && r.geo === geo);
  console.log(`  ${kind} ${geo}: forecast meeting time ${q(X.map(r => r.t), v => v.toFixed(2))} s; its change per second over 0.5 s ${q(X.map(r => r.slope), v => v.toFixed(2))} (-1 = plan holds; > -1 = meeting recedes) n ${X.length}`); }
for (const kind of ['run', 'pass']) for (const geo of ['level', 'trailing']) { const X = fcErr.filter(r => r.kind === kind && r.geo === geo);
  console.log(`  ${kind} ${geo} 0.6 s ahead: carrier ahead of his forecast ${q(X.map(r => r.along), v => v.toFixed(2))} yd (miss ${q(X.map(r => r.across), v => v.toFixed(2))}); own speed now ${q(X.map(r => r.ownNow), v => v.toFixed(1))}, model ${q(X.map(r => r.ownPred), v => v.toFixed(1))}, actual ${q(X.map(r => r.ownAct), v => v.toFixed(1))}, requested ${q(X.map(r => r.req), v => v.toFixed(1))} n ${X.length}`); }
for (const kind of ['run', 'pass']) console.log(`  ${kind} feasible meeting share: ` + ['ahead', 'level', 'trailing'].map(g => { const X = feas.filter(r => r.kind === kind && r.geo === g); return `${g} ${(100 * X.filter(r => r.ok).length / Math.max(1, X.length)).toFixed(0)}%`; }).join(', ') + ` (horizons ${[...new Set(feas.map(r => r.h))].join('/')})`);
console.log(`  first close-gather: n ${gathers.length}, distance ${q(gathers.map(g => g.dist), v => v.toFixed(1))} yd, speed achieved ${q(gathers.map(g => g.ac), v => v.toFixed(1))} / requested ${q(gathers.map(g => g.rq), v => v.toFixed(1))}`);
console.log(`  first dive/lunge:   n ${dives.length}, distance ${q(dives.map(g => g.dist), v => v.toFixed(1))} yd, speed ${q(dives.map(g => g.ac), v => v.toFixed(1))}`);
const P = reach.filter(r => r.geo).map(r => r.pursuit).sort((a, b) => a - b), t1 = P[Math.floor(P.length / 3)], t2 = P[Math.floor(2 * P.length / 3)];
console.log(`  by pursuit rating terciles (cuts ${t1?.toFixed(2)} / ${t2?.toFixed(2)}): achieved aim p50 by geometry, reach within 1 yd by +3 s (2-10 yd starts)`);
for (const [lab, lo, hi] of [['low', -1, t1], ['mid', t1, t2], ['high', t2, 2]] as const) {
  const X = rows.filter(r => r.pursuit >= lo && r.pursuit < hi), R = reach.filter(r => r.geo && r.pursuit >= lo && r.pursuit < hi && r.start >= 2 && r.start <= 10);
  console.log(`    ${lab.padEnd(4)}: aim ahead ${q(X.filter(r => r.geo === 'ahead').map(r => r.acAim))} level ${q(X.filter(r => r.geo === 'level').map(r => r.acAim))} trailing ${q(X.filter(r => r.geo === 'trailing').map(r => r.acAim))} | reach ${(100 * R.filter(r => r.reached !== null).length / Math.max(1, R.length)).toFixed(0)}% (n ${R.length})`);
}
