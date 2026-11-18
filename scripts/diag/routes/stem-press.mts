// STEM_WORK controls: vertical routes (go, fade, seam) against press man (cover1 / cover2man) and against off zone (cover3
// / cover4): separation from the nearest defender at 1.5 s and 2.5 s, and the receiver's lateral offset from his
// route's straight line at 1.5 s. Run once with STEM_WORK unset and once with STEM_WORK=1.
//   node --import tsx scripts/diag/routes/stem-press.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 3);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const VERT = new Set(['go', 'fade', 'seam']);
const rows: Record<string, number[][]> = {};
for (const concept of ['four_verts', 'verts_hitch', 'fade_flat']) for (const coverage of ['cover1', 'cover2man', 'cover3', 'cover4'])
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const start = new Map<any, any>(); const got = new Map<any, number[]>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      for (const r of sim.offense) {
        if (!VERT.has(r.behavior?.route?.id)) continue;
        if (!start.has(r)) start.set(r, { ...r.pos });
        for (const [i, T] of [[0, 1.5], [1, 2.5]] as const) {
          if (Math.abs(sim.t - T) > 0.026 || sim.throwAt >= 0 && sim.throwAt < T) continue;
          const sep = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y)));
          const v = got.get(r) ?? [NaN, NaN, NaN]; v[i] = sep; if (i === 0) v[2] = Math.abs(r.pos.y - start.get(r).y); got.set(r, v);
        }
      }
    };
    sim.run();
    const key = coverage === 'cover1' || coverage === 'cover2man' ? 'press man' : 'off zone';
    for (const v of got.values()) (rows[key] ??= []).push(v);
  }
const med = (a: number[]) => { const b = a.filter(x => x === x).sort((x, y) => x - y); return b.length ? b[b.length >> 1].toFixed(2) : '-'; };
for (const [k, v] of Object.entries(rows)) console.log(`STEM_WORK=${process.env.STEM_WORK ?? '-'} ${k}: n ${v.length} | sep 1.5 s ${med(v.map(x => x[0]))} | sep 2.5 s ${med(v.map(x => x[1]))} | lateral off his start at 1.5 s ${med(v.map(x => x[2]))}`);
