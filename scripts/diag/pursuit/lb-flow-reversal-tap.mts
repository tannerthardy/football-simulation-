// Backer lateral reversals on designed runs (2026-11-24; the outside audit's LB_LINE_FLOW claim). Measurement only.
// For each LB (by position) while his run-fit job is 'insert' and he is not engaged: his final requested lateral velocity
// (intents) each tick; a reversal is a sign change of vy with |vy| > 1 yd/s on both sides within 0.3 s. Counts per play
// and per LB, the worst 1.0 s window, and whether a fit-line-flow / fit-flow-read tag was present.
// Usage: node --import tsx lb-flow-reversal-tap.mts GAMES OUT.json [FIRST=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const LB = /^(LB|ILB|OLB|MLB)/;
const rows: any[] = []; const srcTotal = new Map<string, number>(); const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) {
    s = !compilingPlan() && this.offCall?.kind === 'run' ? { last: new Map<any, { s: number; t: number; dec: number }>(), rev: new Map<any, number[]>(), tags: new Map<any, Set<string>>(), dec: new Map<any, number>(), pursued: new Set<number>(), src: new Map<string, number>() } : null;
    st.set(this, s);
    if (s) {
      // Passive ledger stub (as dither-core): the decision's own lateral request; and which planner issued it.
      this.responsibility = new Proxy({}, { get: (_o, k) => k === 'decision' ? (a: any, _b: unknown, c: any) => { if (c?.vel) s.dec.set(a, c.vel.y); } : () => undefined });
      const self = this;
      this.commandTraceFor = (a: any) => a.team === self.offense[0].team ? undefined : new Proxy({}, { get: (_o, k) => k === 'pursuit' ? () => { s.pursued.add(a.idx); } : () => undefined });
    }
  }
  if (s) s.pursued = new Set<number>();
  const out = tick.call(this);
  if (!s) return out;
  const sim = this;
  for (const d of sim.defense) {
    if (!LB.test(d.player.position) || d.runFit?.kind !== 'insert' || d.engagement) continue;
    const vy = sim.intents[d.idx]?.vel?.y ?? 0;
    if (Math.abs(vy) <= 1) continue;
    const sg = Math.sign(vy), l = s.last.get(d);
    const dv = s.dec.get(d) ?? 0;
    if (l && l.s !== sg && sim.t - l.t <= 0.3 + 1e-9) {
      (s.rev.get(d) ?? s.rev.set(d, []).get(d)!).push(sim.t);
      // Attribution: the decision itself reversed (its lateral sign flipped with it) or a later stage did; and the planner.
      const decRev = Math.abs(dv) > 1 && Math.sign(dv) === sg && l.dec !== 0 && Math.sign(l.dec) !== Math.sign(dv);
      const tagNow = [...(d.tags ?? [])].filter((t: string) => /^fit-/.test(t)).sort().join('+') || 'no fit tag';
      const key = `${decRev ? 'decision reversed' : 'a later stage'} | ${s.pursued.has(d.idx) ? 'pursuit/chase' : 'run fit'}`;
      s.src.set(key, (s.src.get(key) ?? 0) + 1);
      const k2 = `fit tags so far: ${tagNow}`; s.src.set(k2, (s.src.get(k2) ?? 0) + 1);
    }
    s.last.set(d, { s: sg, t: sim.t, dec: dv });
    for (const t of d.tags ?? []) if (/fit-line-flow|fit-flow-read/.test(t)) (s.tags.get(d) ?? s.tags.set(d, new Set()).get(d)!).add(t);
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) {
    const per = [...s.rev.entries()].map(([d, ts]: any) => { let w = 0; for (const t of ts) w = Math.max(w, ts.filter((u: number) => u >= t && u < t + 1.0).length); return { n: ts.length, worst1s: w, tags: [...(s.tags.get(d) ?? [])] }; });
    for (const [k, v] of s.src) srcTotal.set(k, (srcTotal.get(k) ?? 0) + v);
    rows.push({ concept: this.offCall.run?.id ?? null, reversals: per.reduce((a: number, p: any) => a + p.n, 0), worst1s: per.reduce((a: number, p: any) => Math.max(a, p.worst1s), 0), lineFlowLbs: per.filter((p: any) => p.tags.includes('fit-line-flow')).length });
  }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}`); }
writeFileSync(OUT, JSON.stringify(rows));
for (const [k, v] of [...srcTotal.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`  ${v}  ${k}`);
const tot = rows.reduce((a, r) => a + r.reversals, 0);
console.log(`runs ${rows.length} | LB lateral reversals ${tot} (${(tot / rows.length).toFixed(2)}/run) | runs with any ${rows.filter(r => r.reversals).length} | worst 1.0 s p max ${Math.max(0, ...rows.map(r => r.worst1s))}, runs with >= 3 in 1 s ${rows.filter(r => r.worst1s >= 3).length}`);
