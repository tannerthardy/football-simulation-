// Paired staged throws: the same staged plays (concept x coverage x seed), the QB forced to throw to one route slot at
// his first set moment with an open enough look, one arm per process (flags are read at load). Rows pair by key across
// arms. Per play: the target's place at the throw, the QB's aim, the ball's closest pass of him, caught, his first
// sample, the share of in-flight ticks his route owned his feet, the nearest defender at the end, and a 0.05 s trace.
// usage: [flags] npx tsx scripts/diag/catch/paired-throws.ts SEEDS > arm.jsonl
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner, catchSpot } from '../../../src/sim/behaviors/receiver.js';
import { nativeTraceSetup } from '../command-trace.js';
const seeds = Number(process.argv[2] ?? 8);
const concepts = ['four_verts', 'curl_flat', 'mesh', 'y_cross', 'drive', 'stick', 'smash', 'levels'];
const coverages = ['cover1', 'cover2', 'cover3', 'cover4', 'cover3_match'];
const RR: any = RouteRunner.prototype, rr0 = RR.update;
let routeTick = new Set<any>();
RR.update = function (a: any, sim: any) { if (sim.ball?.kind === 'air') routeTick.add(a); return rr0.call(this, a, sim); };
for (const concept of concepts) for (const coverage of coverages) for (let seed = 1; seed <= seeds; seed++) {
  if (process.env.PT_ONLY && !process.env.PT_ONLY.split(',').includes(`${concept}|${coverage}|${seed}`)) continue;
  let sim: any;
  try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
  const dir = sim.attackDir(sim.offense[0].team);
  let rec: any = null, hooked: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const b: any = sim.qb.behavior;
    if (b?.kind === 'qb-pass' && hooked !== b) {
      hooked = b; const upd = b.update.bind(b);
      b.update = (a: any, s: any) => {
        if (!rec && b.phase === 'set' && s.ball.kind === 'held' && s.ball.carrier === a) {
          const cands = s.offense.filter((r: any) => r.behavior?.route?.id).sort((p: any, q: any) => String(p.slot).localeCompare(String(q.slot)));
          for (const r of cands) {
            let ev: any = null; try { ev = b.evaluate(a, s, r, 0); } catch { ev = null; }
            if (!ev || !ev.parts || ev.parts.pOpen < 0.5) continue;
            if (b.startThrow(a, s, ev)) { b.pullDown = () => false; rec = { key: `${concept}|${coverage}|${seed}|${r.slot}`, route: r.behavior.route.id, slot: r.slot, T: r, throwT: s.t, atThrow: { x: r.pos.x, y: r.pos.y }, ticks: 0, route0: 0, min: Infinity, trace: [] }; break; }
          }
        }
        return upd(a, s);
      };
    }
    if (process.env.PT_FINE && rec && rec.T && rec.T.behavior && !rec.T.behavior.__wrapped) { const bh: any = rec.T.behavior, u0 = bh.update.bind(bh); bh.update = (a: any, s2: any) => { let c = u0(a, s2); if (process.env.PT_NOLOOK && c && (s2.ballEstimates?.samplesOf?.(a) ?? 0) > 0) c = { ...c, facing: undefined, look: undefined }; (a as any).__cmd = c?.vel; return c; }; bh.__wrapped = true; }
    routeTick = new Set();
    tick();
    if (rec && rec.end === undefined) {
      const R = rec.T;
      if (!rec.released) { if (sim.ball.kind === 'air') { rec.released = true; rec.throwT = sim.t; } else return; }
      if (sim.ball.kind === 'air') {
        if (rec.aim === undefined && sim.ball.intended) rec.aim = { x: sim.ball.intended.x, y: sim.ball.intended.y };
        rec.ticks++; const owned = routeTick.has(R); if (owned) rec.route0++;
        const bp = sim.ball.flight?.pos, n = sim.ballEstimates?.samplesOf?.(R) ?? 0;
        if (bp && bp.z >= 0.1 && bp.z <= R.profile.maxCatchHeight) { const d = Math.hypot(bp.x - R.pos.x, bp.y - R.pos.y); if (d < rec.min) { rec.min = d; rec.atMin = { x: R.pos.x, y: R.pos.y }; rec.seenAtMin = n > 0; } }
        if (rec.firstSample === undefined && n > 0) rec.firstSample = +(sim.t - rec.throwT).toFixed(2);
        if (Math.abs((sim.t - rec.throwT) / 0.05 - Math.round((sim.t - rec.throwT) / 0.05)) < 1e-6) rec.trace.push([+(sim.t - rec.throwT).toFixed(2), +R.pos.x.toFixed(2), +R.pos.y.toFixed(2), +Math.hypot(R.vel.x, R.vel.y).toFixed(1), owned ? 'R' : 'T', n, ...(process.env.PT_FINE && bp ? (() => { const E: any = sim.ballEstimates, h = E?.headOf?.(R), dg = (v: number) => { let x = v; while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return Math.round(x * 180 / Math.PI); }, brg = Math.atan2(bp.y - R.pos.y, bp.x - R.pos.x); const qp = sim.see(R, sim.qb), qbrg = Math.atan2(qp.pos.y - R.pos.y, qp.pos.x - R.pos.x); return [h === undefined ? 'noTrack' : dg(brg - h), h === undefined ? null : dg(qbrg - h), qp.carrying, qp.arm, (() => { const tc = catchSpot(R, { t: sim.t, ballPath: sim.ballPath }); const pk = E?.peek?.(R, sim) ?? []; const ec = pk.length ? catchSpot(R, { t: sim.t, ballPath: pk }) : null; const f = (c: any) => c ? [+c.p.x.toFixed(1), +c.p.y.toFixed(1), +(c.t - sim.t).toFixed(2)] : null; const cv = (R as any).__cmd; return { true: f(tc), est: f(ec), req: cv ? [+cv.x.toFixed(1), +cv.y.toFixed(1)] : null, ach: [+R.vel.x.toFixed(1), +R.vel.y.toFixed(1)] }; })(), Math.round(((R.body?.trunk ?? 0) * 180) / Math.PI), (() => { const tr: any = (E as any)?.tracks?.get?.(R); return tr ? [tr.searchAt === undefined ? null : +(sim.t - tr.searchAt).toFixed(2), tr.samples?.length ?? 0, !!tr.fit, +(sim.t - tr.attendT).toFixed(2), tr.preLookT === undefined ? null : +(sim.t - tr.preLookT).toFixed(2)] : null; })(), dg(brg - R.facing), R.behavior?.kind, +bp.z.toFixed(1), (() => { const fb: any = (R.behavior as any)?.fallback ?? R.behavior; const pk = E?.peek?.(R, sim) ?? []; const lt = pk.length ? pk[pk.length - 1].t - sim.t : null; const ch: any = (R.behavior as any)?.choice; return [ch ? [+ch.p.x.toFixed(1), +ch.p.y.toFixed(1), +(ch.t - sim.t).toFixed(2)] : null, fb?.route?.family, fb?.deepLookAt === undefined ? null : +(sim.t - fb.deepLookAt).toFixed(2), fb?.bornAt === undefined ? null : +(sim.t - fb.bornAt - fb.breakTime).toFixed(2), pk.length, lt === null ? null : +lt.toFixed(2), E?.lookedAtRelease?.(R, sim)]; })()]; })() : [])]);
      }
      if (sim.ball.kind !== 'air' || sim.ball.securing) {
        let sep = Infinity, D: any = null; for (const d of sim.defense) { const x = Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y); if (x < sep) { sep = x; D = d; } }
        rec.end = sim.t; rec.sep = sep;
        // The nearest defender relative to the receiver's line of run: behind (+) or ahead (-) of him along it, beside him
        // across it, and his speed.
        const sp = Math.hypot(R.vel.x, R.vel.y) || 1, ux = R.vel.x / sp, uy = R.vel.y / sp, dx = D.pos.x - R.pos.x, dy = D.pos.y - R.pos.y;
        rec.def = { behind: +(-(dx * ux + dy * uy)).toFixed(2), beside: +Math.abs(-dx * uy + dy * ux).toFixed(2), speed: +Math.hypot(D.vel.x, D.vel.y).toFixed(1), rSpeed: +sp.toFixed(1) };
      }
    }
  };
  try { sim.run(); } catch { continue; }
  if (!rec || rec.end === undefined) continue;
  const R = rec.T;
  console.log(JSON.stringify({ key: rec.key, route: rec.route, slot: rec.slot, throwT: +rec.throwT.toFixed(2), flight: +(rec.end - rec.throwT).toFixed(2),
    atThrow: rec.atThrow, aim: rec.aim, aimToRcv: rec.aim && rec.atMin ? +Math.hypot(rec.aim.x - rec.atMin.x, rec.aim.y - rec.atMin.y).toFixed(2) : null,
    closest: +rec.min.toFixed(2), inReach: rec.min <= R.profile.reach + 0.3, seenAtMin: !!rec.seenAtMin, firstSample: rec.firstSample ?? null,
    routeShare: rec.ticks ? +(rec.route0 / rec.ticks).toFixed(2) : 0, sepEnd: +rec.sep.toFixed(2), def: rec.def, caught: !!sim.stats?.completed, depth: +(((rec.atThrow.x - sim.los) * dir)).toFixed(1), trace: rec.trace }));
}
