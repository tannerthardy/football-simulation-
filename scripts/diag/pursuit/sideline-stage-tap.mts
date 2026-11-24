// Which pursuit stage steers a tackler in the last 1.0 s before a sideline attempt (2026-11-24). Measurement only.
// Usage: node --import tsx sideline-stage-tap.mts GAMES OUT.json [FIRST_SEED=201]
// Per defender per tick, the pursuit trace records (sim.commandTraceFor ... .pursuit) issued that tick: kind, and for an
// intercept its forecast point's distance to the near sideline and its time. At each missed_tackle / broken_tackle /
// initial tackle_wrap on a scrimmage carrier within 3 yd of the sideline, the tackler's last 10 ticks at 0.1 s.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { FIELD_WIDTH } = await import(`${W}/src/core/field.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 4), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const side = (y: number) => Math.min(y, FIELD_WIDTH - y);
const out: any[] = []; const st = new WeakMap<any, any>(); const noop = () => undefined;
const proto = PlaySim.prototype as any, tick = proto.tick;
proto.commandTraceFor = function (this: any, a: any) {
  const s = st.get(this);
  if (!s || a.team === this.offense[0].team) return undefined;
  return new Proxy({}, { get: (_o, name) => name === 'pursuit' ? (_t: any, d: any) => { (s.cur[a.idx] ??= []).push(d.kind === 'intercept'
    ? { k: 'intercept', fpSide: r2(side(d.forecastPoint.y)), t: r2(d.biasedTime), lev: r2(d.leverage ?? 0), curve: d.forecast?.model ?? null }
    : { k: d.kind ?? '?' }); } : noop });
};
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall && (this.offCall.kind === 'run' || this.offCall.kind === 'pass') ? { seen: this.events.length, cur: {}, hist: {} as any } : null; st.set(this, s); }
  if (s) s.cur = {};
  const res = tick.call(this);
  if (!s) return res;
  const sim = this;
  for (const d of sim.defense) { const h = (s.hist[d.idx] ??= []); h.push({ t: r2(sim.t), tr: s.cur[d.idx] ?? null, beh: d.behavior?.constructor?.name ?? null, kind: d.behavior?.kind ?? null }); if (h.length > 10) h.shift(); }
  for (; s.seen < sim.events.length; s.seen++) {
    const e = sim.events[s.seen];
    if (!['missed_tackle', 'broken_tackle', 'tackle_wrap'].includes(e.type) || (e.type === 'tackle_wrap' && e.note === 'assist')) continue;
    const [d, c] = e.type === 'broken_tackle' ? [sim.agents[e.b], sim.agents[e.a]] : [sim.agents[e.a], sim.agents[e.b]];
    if (!d || !c || c.team !== sim.offense[0].team || side(c.pos.y) >= 3) continue;
    if (c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled) continue;
    out.push({ type: e.type, t: r2(e.t), ptype: sim.offCall.kind, defPos: d.player.position, sideC: r2(side(c.pos.y)), hist: s.hist[d.idx] });
  }
  return res;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${out.length}`); }
writeFileSync(OUT, JSON.stringify(out)); console.log('events', out.length);
