// node --import tsx scripts/diag/coverage/corner-sink.mts [seeds]
// Cover 2 family, every throw: the flat corner on a side whose #1 is 12+ yd past the line at the release.
// Corner downfield speed and depth under #1 at the release; distance to #1 at the arrival; throw kind (to #1 deep / flat / other).
const W = process.cwd(); const seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && c.family !== 'playaction' && c.drop !== 'pa').map(([id]) => id);
const rows: any[] = [];
for (const concept of concepts) for (const coverage of ['cover2', 'cover2_match', 'tampa2']) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const snap = new Map<any, any>(); let thr: any = null, arr: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      if (!snap.size) for (const p of [...sim.offense, ...sim.defense]) snap.set(p, { x: p.pos.x, y: p.pos.y });
      if (sim.throwAt >= 0 && !thr) thr = { arrT: sim.ball.arrivalT, at: new Map([...sim.offense, ...sim.defense].map((p: any) => [p, { x: p.pos.x, y: p.pos.y, vx: p.vel.x }])) };
      if (thr && !arr && sim.t >= thr.arrT) arr = new Map([...sim.offense, ...sim.defense].map((p: any) => [p, { x: p.pos.x, y: p.pos.y }]));
    };
    const res = sim.run(); const s = res.stats; if (!s.attempted || !thr || !arr) continue;
    for (const side of [-1, 1]) {
      const mine = sim.offense.filter((r: any) => r.slot !== 'QB' && (snap.get(r).y - sim.ballY) * side > 0);
      if (!mine.length) continue;
      const one = mine.sort((a: any, b: any) => Math.abs(snap.get(b).y - sim.ballY) - Math.abs(snap.get(a).y - sim.ballY))[0];
      const cb = sim.defense.find((d: any) => /^CB/.test(d.slot) && (snap.get(d).y - sim.ballY) * side > 0); if (!cb) continue;
      const o = thr.at.get(one), c = thr.at.get(cb); if (o.x - sim.los < 12) continue;
      const T = sim.offense.find((r: any) => r.player.id === s.target);
      const kind = T === one ? 'to #1' : T && (snap.get(T).y - sim.ballY) * side > 0 && thr.at.get(T).x - sim.los < 8 ? 'flat side short' : 'other';
      const a1 = arr.get(one), ac = arr.get(cb);
      rows.push({ kind, v: c.vx, under: o.x - c.x, d: Math.hypot(a1.x - ac.x, a1.y - ac.y), caught: !!s.completed, yds: res.yards ?? 0 });
    }
  }
const med = (v: number[]) => { const a = [...v].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)].toFixed(1) : '-'; };
for (const k of ['all', 'to #1', 'flat side short', 'other']) {
  const r = rows.filter(x => k === 'all' || x.kind === k);
  console.log(`${k.padEnd(16)} n ${String(r.length).padStart(4)} | corner downfield at release p50 ${med(r.map(x => x.v))} yd/s (>=2: ${(r.filter(x => x.v >= 2).length / Math.max(1, r.length) * 100).toFixed(0)}%) | depth under #1 ${med(r.map(x => x.under))} | to #1 at arrival ${med(r.map(x => x.d))} | comp ${(r.filter(x => x.caught).length / Math.max(1, r.length) * 100).toFixed(0)}% yd ${(r.reduce((a, x) => a + x.yds, 0) / Math.max(1, r.length)).toFixed(1)}`);
}
