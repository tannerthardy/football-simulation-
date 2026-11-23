// Lane re-diagnosis (Integration, 2026-11-18; reads only). Staged zone throws (cover 2/3/4/6, gun doubles and trips,
// every non-screen concept). Underneath zone defenders whose release position lies within 8 yd of the true ball's
// catchable track. At T* (the true ball nearest him) his actual distance to the ball, and the distance from each aim
// to the true ball's catchable track: (b) the lane as built, passer -> receiver's upfield shoulder now, nearest point
// to him; (c) passer -> the receiver carried along his velocity for a judged flight (distance / 20 yd/s, iterated),
// nearest point to him; (c*) the same with the true flight time (oracle bound); (d) his own estimate 0.3 and 0.15 s
// before T* (its point at T*). Aims (b)/(c) use the true receiver and passer at the release, so this is geometry,
// not his perception. Split by the receiver's motion at the release (settling < 2.5 yd/s; vertical if downfield
// speed >= lateral; across otherwise). Also the distance from him at the release to each aim, the time he has, and
// in a FLIGHT_LANE arm when the lane branch first ran and how often the help gate kept him off it.
// usage: [flags] node --import tsx scripts/diag/yac/lane-aims.mts [seeds]
const W = process.cwd(), seeds = Number(process.argv[2] ?? 1);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { isDeepZone } = await import(`${W}/src/playbook/alignment.ts`);
const D = await import(`${W}/src/sim/behaviors/defense.ts`);
const VB = 20;
type P = { x: number; y: number };
const hd = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (p: P, a: P, b: P): P => { const ux = b.x - a.x, uy = b.y - a.y, L = ux * ux + uy * uy || 1, k = Math.max(0, Math.min(1, ((p.x - a.x) * ux + (p.y - a.y) * uy) / L)); return { x: a.x + ux * k, y: a.y + uy * k }; };
const rows: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        let rel: any = null, endT = Infinity; const tr = new Map<any, any[]>(); const est = new Map<any, any[]>(); const lane = new Map<any, { first: number; view: boolean }>();
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          tick();
          const air = sim.ball?.kind === 'air' && !sim.ball.securing;
          if (air && !rel) {
            const R = sim.ball.target; if (!R) { rel = { skip: true }; return; }
            const dir = sim.attackDir(sim.offense[0].team);
            rel = { t: sim.t, R, dir, qb: { ...sim.qb.pos }, rp: { x: R.pos.x, y: R.pos.y }, rv: { x: R.vel.x, y: R.vel.y }, path: sim.ballPath.map((p: any) => ({ ...p })), d0: new Map(sim.defense.map((d: any) => [d, { x: d.pos.x, y: d.pos.y }])) };
          }
          if (rel && !rel.skip && !air && endT === Infinity) endT = sim.t;
          if (!rel || rel.skip || !air) return;
          for (const d of sim.defense) {
            (tr.get(d) ?? tr.set(d, []).get(d)!).push({ t: sim.t, x: d.pos.x, y: d.pos.y });
            const p = sim.ballEstimates?.peek?.(d, sim); if (p?.length) (est.get(d) ?? est.set(d, []).get(d)!).push({ t: sim.t, path: p.map((q: any) => ({ ...q })) });
            const br = D.flightManBranch?.get(d);
            if (br && br.t >= sim.t - sim.dt - 1e-9) { const L = lane.get(d) ?? { first: Infinity, view: false }; if (br.branch === 'lane') L.first = Math.min(L.first, sim.t - rel.t); if (br.branch === 'view') L.view = true; lane.set(d, L); }
          }
        };
        try { sim.run(); } catch { continue; }
        if (!rel || rel.skip) continue;
        const { R, dir, qb, rp, rv } = rel;
        const tEnd = Math.min(endT, rel.path[rel.path.length - 1]?.t ?? Infinity);
        const sp = Math.hypot(rv.x, rv.y), cls = sp < 2.5 ? 'settling' : Math.abs(rv.x) >= Math.abs(rv.y) ? 'vertical' : 'across';
        const sh = { x: rp.x + dir * R.profile.radius, y: rp.y };
        let tf = hd(qb, rp) / VB; for (let i = 0; i < 4; i++) tf = hd(qb, { x: rp.x + rv.x * tf, y: rp.y + rv.y * tf }) / VB;
        const lead = { x: sh.x + rv.x * tf, y: sh.y + rv.y * tf };
        const tTrue = tEnd - rel.t, leadT = { x: sh.x + rv.x * tTrue, y: sh.y + rv.y * tTrue };
        for (const d of sim.defense) {
          const z = d.behavior?.zone as string | undefined; if (!z || isDeepZone(z)) continue;
          const track = rel.path.filter((p: any) => p.t <= tEnd + 1e-9 && p.z <= d.profile.maxCatchHeight);
          if (!track.length) continue;
          const toTrack = (a: P) => Math.min(...track.map((p: any) => hd(a, p)));
          const p0 = rel.d0.get(d); if (toTrack(p0) > 8) continue;
          const T = tr.get(d) ?? []; if (!T.length) continue;
          // T*: the true ball nearest him (catchable heights), his position then.
          let best = Infinity, ts = 0;
          for (const s of T) { const b = rel.path.reduce((m: any, p: any) => (Math.abs(p.t - s.t) < Math.abs(m.t - s.t) ? p : m)); if (b.z > d.profile.maxCatchHeight) continue; const h = hd(s, b); if (h < best) { best = h; ts = s.t; } }
          if (!Number.isFinite(best)) continue;
          const aimB = near(p0, qb, sh), aimC = near(p0, qb, lead), aimCs = near(p0, qb, leadT);
          const ballAt = (t: number) => rel.path.reduce((m: any, p: any) => (Math.abs(p.t - t) < Math.abs(m.t - t) ? p : m));
          const E = est.get(d) ?? [], estErr = (back: number) => { const s = [...E].reverse().find((e: any) => e.t <= ts - back + 1e-9); if (!s) return null; const q = s.path.reduce((m: any, p: any) => (Math.abs(p.t - ts) < Math.abs(m.t - ts) ? p : m)); return toTrack(q); };
          const L = lane.get(d);
          rows.push({ cls, coverage, reach: d.profile.reach + 0.3, act: best, b: toTrack(aimB), c: toTrack(aimC), cs: toTrack(aimCs), d3: estErr(0.3), d15: estErr(0.15),
            mvB: hd(p0, aimB), mvC: hd(p0, aimC), avail: ts - rel.t, tf, tTrue, laneFirst: L?.first ?? null, viewOnly: !!L?.view && !(L.first < Infinity) });
        }
      }
const q = (v: (number | null)[]) => { const w = v.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(2)).join('/') : '-'; };
const inr = (rs: any[], k: string) => rs.filter((r) => r[k] !== null && r[k] <= r.reach).length;
console.log(`flags BALL_EST=${process.env.BALL_EST ?? 'default'} FLIGHT_MAN=${process.env.FLIGHT_MAN ?? '-'} FLIGHT_LANE=${process.env.FLIGHT_LANE ?? '-'}; underneath defender-throws ${rows.length}`);
for (const cls of ['across', 'settling', 'vertical', 'all']) {
  const rs = rows.filter((r) => cls === 'all' || r.cls === cls);
  console.log(`${cls} n ${rs.length} | dist to true ball line p25/50/75 (within reach n): actual ${q(rs.map(r => r.act))} (${inr(rs, 'act')}) | (b) lane ${q(rs.map(r => r.b))} (${inr(rs, 'b')}) | (c) lead ${q(rs.map(r => r.c))} (${inr(rs, 'c')}) | (c*) true-time lead ${q(rs.map(r => r.cs))} (${inr(rs, 'cs')}) | (d) est -0.3 ${q(rs.map(r => r.d3))} (${inr(rs, 'd3')}) -0.15 ${q(rs.map(r => r.d15))} (${inr(rs, 'd15')})`);
  console.log(`     move to aim from release (b) ${q(rs.map(r => r.mvB))} (c) ${q(rs.map(r => r.mvC))} yd | time release->T* ${q(rs.map(r => r.avail))} s | judged flight ${q(rs.map(r => r.tf))} true ${q(rs.map(r => r.tTrue))} s`);
}
const lr = rows.filter((r) => r.laneFirst !== null || r.viewOnly);
if (lr.length) console.log(`lane arm: lane branch ran ${lr.filter(r => r.laneFirst !== null && r.laneFirst < Infinity).length} (first at ${q(lr.map(r => r.laneFirst < Infinity ? r.laneFirst : null))} s after release), view only (help gate or no pick) ${lr.filter(r => r.viewOnly).length}`);
