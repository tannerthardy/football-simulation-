// Man-trail catch fixture finder: natural plays (no forcing) where a crosser / short in-breaker is caught 3-10 yd
// downfield with his own man defender trailing within 2.5 yd at the secure event and moving with him (speed >= 3,
// heading within 45 deg of the catcher's). Per case: the setup (coverage, concept, formation, seed, flip), the
// defender's distance and closing speed at +0.0 / +0.25 / +0.5 s, and when his chase ('possession-pursuit') starts.
// The cases are the fixture for the shared post-catch seam: trailing at matched speed, he should close, not mirror.
// usage: npx tsx scripts/diag/risk/man-trail-fixture.ts
import { PlaySim } from '../../../src/sim/playsim.js';
import { ReplayTrace } from '../../../src/sim/telemetry.js';
import { nativeTraceSetup } from '../command-trace.js';
import { anticipatedCatcher, hasObservedFlight } from '../../../src/sim/possession-read.js';
const cases: any[] = [];
for (const concept of ['mesh', 'drive', 'shallow_cross', 'levels', 'slant_flat']) for (const coverage of ['cover1', 'cover0']) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= 12; seed++) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
  sim.trace = new ReplayTrace('standard', 1, true);
  let C: any = null;
  const ev0 = sim.event.bind(sim);
  sim.event = (type: string, a: any, b: any, note?: string) => {
    if ((type === 'secure' || type === 'catch') && a?.team === 'O' && !C) {
      const R = a, dir = sim.attackDir(R.team), depth = (R.pos.x - sim.los) * dir;
      const d = sim.defense.find((x: any) => x.behavior?.kind === 'man' && x.behavior.target === R);
      if (d && depth >= 3 && depth <= 10) {
        const dist = Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y), ds = Math.hypot(d.vel.x, d.vel.y), rs = Math.hypot(R.vel.x, R.vel.y);
        const cos = ds > 0.5 && rs > 0.5 ? (d.vel.x * R.vel.x + d.vel.y * R.vel.y) / (ds * rs) : 0;
        if (dist <= 2.5 && ds >= 3 && rs >= 3 && cos >= Math.cos(Math.PI / 4)) {
          const seen = sim.see(d, R), run = Math.atan2(seen.vel.y, seen.vel.x), toQB = Math.atan2(sim.qb.pos.y - R.pos.y, sim.qb.pos.x - R.pos.x);
          const deg = (x: number) => Math.round(Math.abs(Math.atan2(Math.sin(x), Math.cos(x))) * 180 / Math.PI);
          C = { R, d, t0: sim.t, rs, samples: [] as any[], flight: hasObservedFlight(d), opp: false,
            onBall: d.tags.has('onBall') ? 0 : null as number | null, look: seen.facing === undefined ? null : deg(seen.facing - run), qbOff: deg(toQB - run), dist: +dist.toFixed(2) };
        }
      }
    }
    return ev0(type, a, b, note);
  };
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    if (C && sim.t - C.t0 <= 0.55) { const R = sim.ball.kind === 'held' ? sim.ball.carrier : C.R, d = C.d, rx = R.pos.x - d.pos.x, ry = R.pos.y - d.pos.y, L = Math.hypot(rx, ry) || 1;
      if (!C.opp && anticipatedCatcher(d, sim)?.target === C.R) C.opp = true;
      if (C.onBall === null && d.tags.has('onBall')) C.onBall = +(sim.t - C.t0).toFixed(2);
      C.samples.push({ t: sim.t - C.t0, dist: L, closing: ((d.vel.x - R.vel.x) * rx + (d.vel.y - R.vel.y) * ry) / L }); } };
  sim.run();
  if (!C || !sim.stats.completed) continue;
  const at = (k: number) => C.samples.reduce((b: any, x: any) => Math.abs(x.t - k) < Math.abs(b.t - k) ? x : b, C.samples[0]);
  const pp = (sim.trace.data?.decisions ?? []).find((x: any) => x.a === C.d.idx && x.kind === 'possession-pursuit' && x.t >= C.t0 - 0.05);
  cases.push({ coverage, concept, formation, seed, flip, route: C.R.behavior?.route?.id ?? C.R.behavior?.fallback?.route?.id, rs: +C.rs.toFixed(1),
    d0: +at(0).dist.toFixed(2), c0: +at(0).closing.toFixed(2), d25: +at(0.25).dist.toFixed(2), c25: +at(0.25).closing.toFixed(2), d5: +at(0.5).dist.toFixed(2), c5: +at(0.5).closing.toFixed(2),
    chase: pp ? +(pp.t - C.t0).toFixed(2) : null, flight: C.flight, opportunity: C.opp, onBall: C.onBall, look: C.look, qbOff: C.qbOff, dist0: C.dist });
}
const q = (v: number[]) => { const x = v.filter(n => n === n).sort((a, b) => a - b); return x.length ? x[Math.floor((x.length - 1) / 2)].toFixed(2) : '-'; };
for (const [lab, v] of [['no flight', cases.filter(c => !c.flight)], ['flight', cases.filter(c => c.flight)]] as const)
  console.log(`${lab}: n ${v.length} | receiver's seen facing off his run at the secure p50 ${q(v.map(c => c.look ?? NaN))} deg (cue needs >= ~102 deg) | QB off his run ${q(v.map(c => c.qbOff))} deg | looked back past 102 deg ${v.filter(c => (c.look ?? 0) >= 102).length}/${v.length} | routes ${JSON.stringify(v.reduce((m: any, c: any) => (m[c.route] = (m[c.route] ?? 0) + 1, m), {}))}`);
for (const [lab, v] of [['no flight', cases.filter(c => !c.flight)], ['flight', cases.filter(c => c.flight)]] as const)
  console.log(`HANDS_CUE=${process.env.HANDS_CUE ?? 0} ${lab}: n ${v.length} | recognised the throw (onBall) by the secure ${v.filter(c => c.onBall === 0).length}, within 0.55 s ${v.filter(c => c.onBall !== null).length}, p50 at ${q(v.filter(c => c.onBall !== null).map(c => c.onBall))} s | closing at 0 / 0.25 / 0.5 s ${q(v.map(c => c.c0))} / ${q(v.map(c => c.c25))} / ${q(v.map(c => c.c5))} | chase p50 ${q(v.filter(c => c.chase !== null).map(c => c.chase))} s`);
console.log(`acquired the flight by the secure event ${cases.filter(c => c.flight).length}/${cases.length}; a catch opportunity naming his man within 0.55 s ${cases.filter(c => c.opportunity).length}/${cases.length}`);
console.log(`man-trail catch cases n ${cases.length} | distance at 0 / 0.25 / 0.5 s ${q(cases.map(c => c.d0))} / ${q(cases.map(c => c.d25))} / ${q(cases.map(c => c.d5))} | closing ${q(cases.map(c => c.c0))} / ${q(cases.map(c => c.c25))} / ${q(cases.map(c => c.c5))} yd/s | chase starts p50 ${q(cases.filter(c => c.chase !== null).map(c => c.chase))} s`);
for (const c of cases.slice(0, 12)) console.log('  ' + JSON.stringify(c));
