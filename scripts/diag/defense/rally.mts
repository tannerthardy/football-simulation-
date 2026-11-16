// The rally to a short catch (Defense, after HIGH_LOW's re-diagnosis). Staged: every pass concept but screens against
// zone and man calls; completions caught 0-12 yd past the line. For every defender: when he first comes within 1 yd of
// the carrier (arrival), his distance from the catch point at the throw and from the carrier at the catch; at the catch,
// the angle between his velocity and the line to the carrier (under 45, 45-90, over 90 deg; slower than 1 yd/s is its
// own bin) and whether he faced the quarterback (body within 90 deg of the line back to the QB) or had his back to the
// ball; his requested and achieved speed along the line to the carrier at +0.25 and +0.5 s. Rows for the first and the
// second defender to arrive, and for every defender within 8 yd of the carrier at the catch.
//   node --import tsx scripts/diag/defense/rally.mts [seeds] [--rows]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2), ROWS = process.argv.includes('--rows');
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const ang = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
const out: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover1', 'cover2', 'cover3', 'cover3_match', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const req = new Map<any, any>(); let thrAt: Map<any, any> | null = null, C: any = null, tc = 0, catchPt: any = null; const D = new Map<any, any>();
        const dir = sim.attackDir(sim.offense[0].team);
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          for (const d of sim.defense) { const b = d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { const r = u(...q); req.set(d, r); return r; }; b.__h = 1; } }
          tick();
          if (!thrAt && sim.ball.kind === 'air') thrAt = new Map(sim.defense.map((d: any) => [d, { x: d.pos.x, y: d.pos.y }]));
          if (thrAt && !C && sim.catchAt >= 0 && sim.ball.kind === 'held') {
            C = sim.ball.carrier; tc = sim.t; catchPt = { x: C.pos.x, y: C.pos.y };
            const depth = (C.pos.x - sim.los) * dir; if (depth < 0 || depth > 12) { C = 'skip'; return; }
            const qb = sim.qb;
            for (const d of sim.defense) {
              const lx = C.pos.x - d.pos.x, ly = C.pos.y - d.pos.y, line = Math.atan2(ly, lx), sp = Math.hypot(d.vel.x, d.vel.y);
              const facing = d.facing ?? Math.atan2(d.vel.y, d.vel.x);
              const toQB = Math.atan2(qb.pos.y - d.pos.y, qb.pos.x - d.pos.x);
              const t0 = thrAt.get(d);
              D.set(d, { slot: d.slot, distCatch: Math.hypot(lx, ly), distThrow: Math.hypot(catchPt.x - t0.x, catchPt.y - t0.y),
                bin: sp < 1 ? 'slow' : ang(Math.atan2(d.vel.y, d.vel.x), line) < 45 ? '<45' : ang(Math.atan2(d.vel.y, d.vel.x), line) < 90 ? '45-90' : '>90',
                faceQB: ang(facing, toQB) < 90, arrive: null as number | null, m: {} as any });
            }
          }
          if (C && C !== 'skip' && sim.ball.kind === 'held' && sim.ball.carrier === C) {
            const t = sim.t - tc;
            for (const [d, r] of D) {
              const lx = C.pos.x - d.pos.x, ly = C.pos.y - d.pos.y, L = Math.hypot(lx, ly);
              if (r.arrive === null && L < 1) r.arrive = t;
              for (const k of [0.25, 0.5]) if (r.m[k] === undefined && t >= k - 1e-9 && L > 0.01 && r.arrive === null && !sim.bond?.tacklers?.includes(d)) {
                const q = req.get(d); const ux = lx / L, uy = ly / L;
                const cm = sim.cmds?.[d.idx], it = sim.intents?.[d.idx];
                r.m[k] = { got: d.vel.x * ux + d.vel.y * uy, req: q?.vel ? q.vel.x * ux + q.vel.y * uy : NaN, cmd: cm?.vel ? cm.vel.x * ux + cm.vel.y * uy : NaN, intent: it?.vel ? it.vel.x * ux + it.vel.y * uy : NaN,
                  effort: it?.effort ?? 1, faceOff: it?.vel ? ang(d.facing, Math.atan2(it.vel.y, it.vel.x)) : NaN, scale: d.speedScale, vmax: d.profile.vmax };
              }
            }
          }
        };
        const res = sim.run();
        if (!C || C === 'skip' || !sim.stats.completed) continue;
        const rows = [...D.values()];
        const arr = rows.filter((r) => r.arrive !== null).sort((a, b) => a.arrive - b.arrive);
        out.push({ concept, coverage, yards: res.yards ?? 0, first: arr[0] ?? null, second: arr[1] ?? null, near: rows.filter((r) => r.distCatch < 8) });
        if (ROWS) process.stdout.write(JSON.stringify(out[out.length - 1]) + '\n');
      }
if (!ROWS) {
  const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))].toFixed(2) : '-'; };
  console.log(`short completions (0-12 yd) ${out.length}; yards p50 ${q(out.map((o) => o.yards), .5)} mean ${(out.reduce((s, o) => s + o.yards, 0) / out.length).toFixed(2)}; first arrives ${(out.filter((o) => o.first).length / out.length).toFixed(2)}, second ${(out.filter((o) => o.second).length / out.length).toFixed(2)}`);
  for (const [lab, pick] of [['first', (o: any) => o.first], ['second', (o: any) => o.second]] as const) {
    const R = out.map(pick).filter(Boolean);
    console.log(`  ${lab}: arrival p25/p50/p75 ${q(R.map((r: any) => r.arrive), .25)}/${q(R.map((r: any) => r.arrive), .5)}/${q(R.map((r: any) => r.arrive), .75)} s | from the carrier at the catch ${q(R.map((r: any) => r.distCatch), .5)} yd, from the catch point at the throw ${q(R.map((r: any) => r.distThrow), .5)} yd`);
  }
  const N = out.flatMap((o) => o.near);
  console.log(`  every defender within 8 yd at the catch (n ${N.length}), by his velocity off the line to the carrier and facing:`);
  for (const bin of ['<45', '45-90', '>90', 'slow']) for (const fq of [true, false]) {
    const S = N.filter((r: any) => r.bin === bin && r.faceQB === fq); if (S.length < 10) continue;
    console.log(`    ${bin.padEnd(5)} ${fq ? 'facing QB ' : 'back to QB'} n ${String(S.length).padStart(5)} | along the line +0.25 s req/cmd/intent/got ${q(S.map((r: any) => r.m[0.25]?.req), .5)}/${q(S.map((r: any) => r.m[0.25]?.cmd), .5)}/${q(S.map((r: any) => r.m[0.25]?.intent), .5)}/${q(S.map((r: any) => r.m[0.25]?.got), .5)} | +0.5 s ${q(S.map((r: any) => r.m[0.5]?.req), .5)}/${q(S.map((r: any) => r.m[0.5]?.cmd), .5)}/${q(S.map((r: any) => r.m[0.5]?.intent), .5)}/${q(S.map((r: any) => r.m[0.5]?.got), .5)} | +0.25 s effort ${q(S.map((r: any) => r.m[0.25]?.effort), .5)} facing off intent ${q(S.map((r: any) => r.m[0.25]?.faceOff), .5)} deg, speedScale ${q(S.map((r: any) => r.m[0.25]?.scale), .5)}, vmax ${q(S.map((r: any) => r.m[0.25]?.vmax), .5)} | arrives ${(S.filter((r: any) => r.arrive !== null).length / S.length).toFixed(2)}, p50 ${q(S.map((r: any) => r.arrive), .5)} s | dist at catch ${q(S.map((r: any) => r.distCatch), .5)}`);
  }
}
