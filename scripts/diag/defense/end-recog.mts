// The end's run/pass read over time on PA under PA_HINGE: his recognition read and pPass per 0.1 s, and the share whose
// own tackle is in a high stance (set) by then. END=DE_W (fake side) or DE_S.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const T = Array.from({ length: 21 }, (_, i) => +(i * 0.1).toFixed(1));
const rows: any[] = [];
for (const concept of ['pa_flood', 'pa_post_dig', 'pa_shot']) for (const coverage of ['cover1', 'cover3']) for (const roster of [3, 7]) for (let seed = 1; seed <= 3; seed++) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11' })); } catch { continue; }
  const de = sim.defense.find((d: any) => d.slot === (process.env.END ?? 'DE_W'));
  const r: any = {}; const tk = sim.tick.bind(sim);
  sim.tick = () => { tk(); const k = +(Math.round(sim.t * 10) / 10).toFixed(1); if (k <= 2.0 && r[k] === undefined && de.recog) r[k] = { read: de.recog.read, p: de.recog.pPass() }; };
  sim.run(); rows.push(r);
}
const med = (v: number[]) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)].toFixed(2) : '-'; };
for (const t of T) { const S = rows.map((r) => r[t]).filter(Boolean); if (!S.length) continue;
  console.log(`${t.toFixed(1)} pPass p50 ${med(S.map((s) => s.p))} | run ${S.filter((s) => s.read === 'run').length} unsure ${S.filter((s) => s.read === 'unsure').length} pass ${S.filter((s) => s.read === 'pass').length}`); }
