const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
let reps = 0, withReset = 0, steps = 0; const durs: number[] = [], leanAt: number[] = [], firstAt: number[] = [], vxAfter: number[] = [], vxBefore: number[] = [];
for (let seed = 1; seed <= 24; seed++) for (const concept of ['four_verts', 'smash']) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  const tackles = sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT');
  const seen = new Map<any, any>();
  while (sim.phase === 'live' && sim.t < 4 && sim.throwAt < 0 && sim.carrier === sim.qb) {
    sim.tick();
    for (const tk of tackles) {
      const e = tk.engagement; if (!e || e.type !== 'pass') continue;
      if (!seen.has(e)) { seen.set(e, { until: undefined, n: 0 }); reps++; }
      const s = seen.get(e), st = e.baseReset;
      if (st?.until !== undefined && st.until !== s.until) {
        if (s.n === 0) { withReset++; firstAt.push(sim.t); }
        s.n++; steps++; s.until = st.until; durs.push(st.until - sim.t); vxBefore.push(tk.vel.x); s.pending = st.until;
      }
      if (s.pending !== undefined && sim.t >= s.pending + 0.25) { vxAfter.push(tk.vel.x); leanAt.push(Math.hypot(tk.body.support.lean.x, tk.body.support.lean.y)); s.pending = undefined; }
    }
  }
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
console.log(`tackle pass reps ${reps}, with a re-set ${withReset}, steps ${steps}; first at t p25/50/75 ${q(firstAt, .25)}/${q(firstAt)}/${q(firstAt, .75)} s; step ${q(durs)} s; x-vel at the step ${q(vxBefore)} -> 0.25 s after landing ${q(vxAfter)}; lean then ${q(leanAt)}`);
