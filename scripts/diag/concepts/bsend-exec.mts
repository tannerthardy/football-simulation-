// Probe (Defense, report only): the free backside end on zone runs 0.5-1.5 s; where his body loses the request.
// Fixed run set (out/matched-restage, zone schemes). Per free tick: final request speed and direction, his facing off that
// direction and the directional speed cap it allows (vmax x directionalSpeedFactor x speedScale), achieved speed and its
// component along the request, achieved acceleration along it vs the free-gait bound (cap - v)/tau, support state.
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
import { directionalSpeedFactor, fatigueFactor } from '../../../src/physics/kinematics.js';
(PlaySim as any).recordedSingleStream = true;
const ZONE = new Set(['insideZone', 'outsideZone', 'wideZone', 'splitZone', 'stretch', 'toss']);
const ad = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const R: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const call = st.offCall; let end: any = null, side = 0, prev: any = null; const tick0 = sim.tick.bind(sim);
  sim.tick = () => {
    if (!end) { const dir = sim.attackDir(sim.offense[0].team); side = (call.run.direction === 'strong' ? 1 : -1) * sim.offAlign.strongSign;
      end = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * dir) < 1.5 && d.behavior?.kind === 'rush' && Math.sign(d.pos.y - sim.ballY) === -side)
        .sort((p: any, q: any) => Math.abs(q.pos.y - sim.ballY) - Math.abs(p.pos.y - sim.ballY))[0] ?? null; }
    tick0();
    if (!end || sim.phase !== 'live') return;
    const v = { ...end.vel }; const itNow = sim.intents[end.idx]?.vel; const hNow = itNow && Math.hypot(itNow.x, itNow.y) > 0.5 ? Math.atan2(itNow.y, itNow.x) : null;
    if (sim.t >= 0.5 && sim.t <= 1.5 && !end.engagement && prev) {
      const it = sim.intents[end.idx]?.vel ?? { x: 0, y: 0 }, rs = Math.hypot(it.x, it.y);
      if (rs > 0.5) {
        const dr = Math.atan2(it.y, it.x), ux = it.x / rs, uy = it.y / rs, rel = ad(end.body.facing - dr);
        const cap = end.profile.vmax * directionalSpeedFactor(end.profile, rel) * (end.speedScale ?? 1) * fatigueFactor(end.body.energy);
        const along = v.x * ux + v.y * uy, alongPrev = prev.x * ux + prev.y * uy, acc = (along - alongPrev) / 0.05;
        const s = end.body.support;
        R.push({ rs, cap, sp: Math.hypot(v.x, v.y), along, acc, accMax: Math.max(0, (Math.min(rs, cap) - alongPrev)) / end.profile.tau,
          rel: Math.abs(rel) * 57.3, t: sim.t, turn: (sim as any).__hPrev == null ? null : Math.abs(ad(dr - (sim as any).__hPrev)) * 57.3 / 0.05, vrel: Math.abs(ad(Math.atan2(v.y, v.x) - dr)) * 57.3, toward: -side * v.y, reqToward: -side * it.y, handed: !!(sim.carrier && sim.carrier !== sim.qb), state: s?.state, foot: !!s?.foot, strike: !!s?.strike, lean: s ? Math.hypot(s.lean.x, s.lean.y) : 0, chase: end.tags?.has?.('backside-chase') });
      }
    }
    prev = v; (sim as any).__hPrev = hNow;
  };
  sim.run();
}
const q = (v: number[]) => { const w = [...v].sort((a, b) => a - b); return [.25, .5, .75].map(p => w[Math.floor(p * (w.length - 1))].toFixed(2)).join('/'); };
const pct = (f: (r: any) => boolean) => (100 * R.filter(f).length / R.length).toFixed(0) + '%';
console.log('free backside-end ticks 0.5-1.5 s', R.length);
console.log(' request speed', q(R.map(r => r.rs)), '| facing cap along request', q(R.map(r => r.cap)), '| request above cap', pct(r => r.rs > r.cap + 0.05));
console.log(' facing off request (deg)', q(R.map(r => r.rel)), '| achieved speed', q(R.map(r => r.sp)), '| along request', q(R.map(r => r.along)));
console.log(' along / min(request, cap)', q(R.map(r => r.along / Math.max(0.1, Math.min(r.rs, r.cap)))));
console.log(' accel along request', q(R.map(r => r.acc)), '| free-gait bound (target - v)/tau', q(R.map(r => r.accMax)), '| accel / bound', q(R.filter(r => r.accMax > 0.5).map(r => r.acc / r.accMax)));
console.log(' support: up', pct(r => r.state === 'up'), 'foot', pct(r => r.foot), 'strike', pct(r => r.strike), 'leaning', pct(r => r.lean > 1e-6), '| chase-open', pct(r => r.chase));
for (const [lab, f] of [['facing within 45 deg', (r: any) => r.rel <= 45], ['45-100 deg', (r: any) => r.rel > 45 && r.rel <= 100], ['over 100 deg (backpedal/shuffle)', (r: any) => r.rel > 100]] as const) {
  const S = R.filter(f); if (!S.length) continue;
  console.log(`  ${lab}: ${(100 * S.length / R.length).toFixed(0)}% | req ${q(S.map(r => r.rs))} cap ${q(S.map(r => r.cap))} along ${q(S.map(r => r.along))} accel/bound ${q(S.filter(r => r.accMax > 0.5).map(r => r.acc / r.accMax))}`);
}
for (const t0 of [0.5, 0.75, 1.0, 1.25, 1.5]) {
  const S = R.filter(r => Math.abs(r.t - t0) < 0.03); if (S.length < 5) continue;
  console.log(`  t ${t0.toFixed(2)} n ${S.length}: request speed ${q(S.map(r => r.rs))} toward play ${q(S.map(r => r.reqToward))} | achieved speed ${q(S.map(r => r.sp))} toward play ${q(S.map(r => r.toward))} | handed off ${(100 * S.filter(r => r.handed).length / S.length).toFixed(0)}%`);
}
console.log(' request heading turn (deg/s)', q(R.filter(r => r.turn !== null).map(r => r.turn)), '| ticks turning > 20 deg', (100 * R.filter(r => r.turn !== null && r.turn * 0.05 > 20).length / R.length).toFixed(1) + '%', '| velocity off request (deg)', q(R.map(r => r.vrel)));
