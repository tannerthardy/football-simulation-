// In-view defenders under FLIGHT_MAN (Integration, 2026-11-17; reads only): the error of (a) his landing estimate and
// (b) a short extrapolation of his own latest ball samples (the last two sightings' position and velocity, ballistic),
// both evaluated at T*, the moment the true ball passes nearest him, by time left before T*; and how many in-view
// defender-plays had the ball pass within his reach (arms to his side, his jump above) at all.
// usage: BALL_EST=26657 ACQ_SEEN=1 TRACKED_CATCH=1 FLIGHT_MAN=1 node --import tsx scripts/diag/yac/inview-err.mts [seeds]
const W = process.cwd(), seeds = Number(process.argv[2] ?? 1);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const D = await import(`${W}/src/sim/behaviors/defense.ts`);
const G = 10.72; // yd/s^2
const errs: { left: number; est: number | null; ext: number | null }[] = [];
let plays = 0, within = 0, withinView = 0, allPlays = 0, allWithin = 0, allWithinUnder = 0, allWithinDeep = 0;
const { isDeepZone } = await import(`${W}/src/playbook/alignment.ts`);
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const per = new Map<any, any>();
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          tick();
          if (sim.ball?.kind !== 'air' || sim.ball.securing) return;
          const b = sim.ball.flight.pos, E = sim.ballEstimates;
          for (const d of sim.defense) {
            const br = D.flightManBranch.get(d);
            let s = per.get(d);
            if (!s) { s = { view: false, track: [] as any[], snaps: [] as any[], prev: null as any }; per.set(d, s); }
            s.track.push({ t: sim.t, b: { ...b }, d: { x: d.pos.x, y: d.pos.y } });
            if (br && br.branch === 'view' && br.t >= sim.t - sim.dt - 1e-9) s.view = true;
            const last = E?.lastSeen?.(d);
            if (last && (!s.prev || last.t > s.prev.t + 1e-9)) { if (s.prev) s.vel = { x: (last.pos.x - s.prev.pos.x) / (last.t - s.prev.t), y: (last.pos.y - s.prev.pos.y) / (last.t - s.prev.t), z: (last.pos.z - s.prev.pos.z) / (last.t - s.prev.t) }; s.prev = last; }
            if (s.view && Math.round(sim.t / sim.dt) % 2 === 0) s.snaps.push({ t: sim.t, path: E?.peek?.(d, sim)?.map((p: any) => ({ ...p })) ?? [], last: s.prev ? { ...s.prev, pos: { ...s.prev.pos } } : null, vel: s.vel ? { ...s.vel } : null });
          }
        };
        try { sim.run(); } catch { continue; }
        for (const [d, s] of per) {
          if (d.behavior?.zone && s.track.length) { allPlays++; const nr = s.track.reduce((m: any, q: any) => (Math.hypot(q.b.x - q.d.x, q.b.y - q.d.y) < Math.hypot(m.b.x - m.d.x, m.b.y - m.d.y) ? q : m));
            if (Math.hypot(nr.b.x - nr.d.x, nr.b.y - nr.d.y) <= d.profile.reach + 0.3 && nr.b.z <= d.profile.maxCatchHeight) { allWithin++; if (isDeepZone(d.behavior.zone)) allWithinDeep++; else allWithinUnder++; } }
          if (!s.view || !s.track.length) continue;
          plays++;
          const near = s.track.reduce((m: any, q: any) => (Math.hypot(q.b.x - q.d.x, q.b.y - q.d.y) < Math.hypot(m.b.x - m.d.x, m.b.y - m.d.y) ? q : m));
          const dh = Math.hypot(near.b.x - near.d.x, near.b.y - near.d.y);
          if (dh <= d.profile.reach + 0.3 && near.b.z <= d.profile.maxCatchHeight) within++;
          for (const sn of s.snaps) {
            const left = near.t - sn.t; if (left < 0) continue;
            let est: number | null = null, ext: number | null = null;
            if (sn.path.length) { const q = sn.path.reduce((m: any, p: any) => (Math.abs(p.t - near.t) < Math.abs(m.t - near.t) ? p : m)); est = Math.hypot(q.x - near.b.x, q.y - near.b.y, q.z - near.b.z); }
            if (sn.last && sn.vel) { const dt = near.t - sn.last.t; ext = Math.hypot(sn.last.pos.x + sn.vel.x * dt - near.b.x, sn.last.pos.y + sn.vel.y * dt - near.b.y, sn.last.pos.z + sn.vel.z * dt - 0.5 * G * dt * dt - near.b.z); }
            errs.push({ left, est, ext });
          }
        }
      }
const q = (v: (number | null)[]) => { const w = v.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(2)).join('/') : '-'; };
console.log(`all zone defender-plays ${allPlays}; ball within reach ${allWithin} (underneath ${allWithinUnder}, deep ${allWithinDeep})`);
console.log(`in-view defender-plays ${plays}; ball passed within his reach (arms to the side, his jump above) on ${within}`);
for (const [lo, hi] of [[0, 0.1], [0.1, 0.2], [0.2, 0.3], [0.3, 0.5], [0.5, 0.8], [0.8, 9]]) {
  const V = errs.filter((e) => e.left >= lo && e.left < hi);
  console.log(`  ${lo.toFixed(1)}-${hi === 9 ? '+' : hi.toFixed(1)} s before T*: n ${V.length} | landing estimate err ${q(V.map(e => e.est))} yd | short extrapolation err ${q(V.map(e => e.ext))} yd`);
}
