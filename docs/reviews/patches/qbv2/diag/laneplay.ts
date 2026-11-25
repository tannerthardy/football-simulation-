// LANE_PLAY re-measure (engine belief, observer only): for every non-rusher defender whose body comes within his reach of
// the ball in flight more than LANE_NEAR (3 yd) short of the catch point, whether he played it (pbu, deflection,
// interception), by the ball's height at his closest approach and whether he faced the passer (within 60 deg) then.
import { PlaySim } from '../wt949/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt949/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt949/scripts/diag/command-trace.js';
const TAUGHT: any = { slant_flat: { back: 'check' }, quick_outs: { back: 'back_flat' } };
const cells = [['quick_outs', 'cover3', 'gun_doubles_11'], ['quick_outs', 'cover2', 'gun_doubles_11'], ['quick_outs', 'cover1', 'gun_doubles_11'], ['quick_outs', 'cover2man', 'gun_doubles_11'],
  ['slant_flat', 'cover3', 'gun_doubles_11'], ['slant_flat', 'cover1', 'gun_doubles_11'], ['stick', 'cover3', 'gun_trips_11'], ['stick', 'cover2', 'gun_trips_11']];
const rows: any[] = [];
for (const [con, cov, form] of cells) for (let seed = 1; seed <= 30; seed++) {
  const setup: any = nativeTraceSetup({ concept: con, coverage: cov, seed, roster: 3, formation: form, flip: false });
  if (TAUGHT[con]) setup.offCall.pass = { ...PASS_BY_ID[con], ...TAUGHT[con] };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); let th: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, t: any, v0: any, intended: any, arrT: number, ...rest: any[]) => { if (!th && t) th = { t0: sim.t, arrT, pt: { ...intended }, qb: { ...sim.qb.pos }, men: new Map() }; return tb(q, t, v0, intended, arrT, ...rest); };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0();
    if (th && sim.t <= th.arrT + 0.02) { const bp = sim.ballPos(); if (Math.hypot(bp.x - th.pt.x, bp.y - th.pt.y) > 3) for (const d of sim.defense) {
      if (d.pos.x - sim.los < 1) continue; // rushers at the line: their own rule (RUSH_BAT)
      const dd = Math.hypot(bp.x - d.pos.x, bp.y - d.pos.y), m = th.men.get(d.idx);
      if (!m || dd < m.dd) { const toQB = Math.atan2(th.qb.y - d.pos.y, th.qb.x - d.pos.x), f = Math.abs(Math.atan2(Math.sin(d.body.facing - toQB), Math.cos(d.body.facing - toQB))) < Math.PI / 3;
        th.men.set(d.idx, { dd, z: bp.z, faces: f, reach: d.profile.reach, slot: d.slot, frac: (sim.t - th.t0) / Math.max(0.01, th.arrT - th.t0) }); } } }
    if (sim.t > 5) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  if (!th) continue;
  const ev = sim.events as any[];
  for (const [id, m] of th.men) if (m.dd <= m.reach + 0.25) rows.push({ cell: `${con}/${cov}`, ...m, played: ev.some((e) => ['pbu', 'deflection', 'interception'].includes(e.type) && e.a === id), picked: ev.some((e) => e.type === 'interception' && e.a === id) });
}
const band = (z: number) => z < 1.5 ? 'z<1.5' : z < 2.5 ? '1.5-2.5' : z < 3.2 ? '2.5-3.2' : 'z>=3.2';
const g: Record<string, number[]> = {};
for (const r of rows) { const k = `${band(r.z)} ${r.faces ? 'facing' : 'away'}`; (g[k] ??= [0, 0, 0]); g[k][0]++; g[k][1] += r.played ? 1 : 0; g[k][2] += r.picked ? 1 : 0; }
console.log('lane contacts (within reach + 0.25, > 3 yd short of the catch):', rows.length);
for (const [k, [n, p, i]] of Object.entries(g).sort()) console.log(' ', k.padEnd(18), 'n', n, 'played', p, `(${(p / n).toFixed(2)})`, 'picked', i);
const byCell: Record<string, number[]> = {}; for (const r of rows) { (byCell[r.cell] ??= [0, 0]); byCell[r.cell][0]++; byCell[r.cell][1] += r.played ? 1 : 0; }
console.log('by cell (n, played):', JSON.stringify(byCell));
