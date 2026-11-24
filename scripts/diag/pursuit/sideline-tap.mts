// Tackle attempts by distance to the sideline (2026-11-24), measurement only, for the sideline film with Run Game.
// Usage: node --import tsx sideline-tap.mts GAMES OUT.json [FIRST_SEED=201]
// Attempts = missed_tackle + tackle_wrap(initial), scrimmage carriers, as tackle-rates.mts. Per attempt: the carrier's
// distance to the near sideline, whether the tackler is inside him (between him and the middle), both velocities
// split toward the near sideline (+) and upfield (+), and the last 1.0 s at 10 Hz of both bodies relative to the
// carrier at the attempt, with game, play index and time for filming.
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
const events: any[] = []; const st = new WeakMap<any, any>(); let game = 0, playNo = 0;
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall && this.defCall && (this.offCall.kind === 'run' || this.offCall.kind === 'pass') ? { seen: this.events.length, recs: [] as any[], hist: [] as any[], next: 0, play: playNo++ } : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, dir = sim.attackDir(sim.offense[0].team);
  if (sim.t >= s.next - 1e-9) { s.next += 0.1; s.hist.push({ t: sim.t, p: sim.agents.map((a: any) => [a.pos.x, a.pos.y, a.vel.x, a.vel.y]) }); if (s.hist.length > 11) s.hist.shift(); }
  for (; s.seen < sim.events.length; s.seen++) {
    const e = sim.events[s.seen];
    if (e.type !== 'missed_tackle' && e.type !== 'tackle_wrap') continue;
    if (e.type === 'tackle_wrap' && e.note === 'assist') continue;
    const d = sim.agents[e.a], c = sim.agents[e.b];
    if (!d || !c || c.team !== sim.offense[0].team) continue;
    const pocket = c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled;
    if (pocket) continue;
    const nearLow = c.pos.y < FIELD_WIDTH / 2, side = nearLow ? -1 : 1;           // +y component toward the near sideline
    const sideDist = nearLow ? c.pos.y : FIELD_WIDTH - c.pos.y;
    const loc = (a: any) => ({ up: r2((a.pos.x - c.pos.x) * dir), out: r2((a.pos.y - c.pos.y) * side), vUp: r2(a.vel.x * dir), vOut: r2(a.vel.y * side) });
    const D = loc(d), C = loc(c);
    s.recs.push({ cx: c.pos.x, dir, game, play: s.play, t: r2(e.t), type: e.type, detail: e.note ?? null, carrierPos: c.player.position, defPos: d.player.position,
      runFit: d.runFit?.kind ?? null, sideDist: r2(sideDist), inside: D.out < 0, def: D, car: { vUp: C.vUp, vOut: C.vOut },
      near5: sim.defense.filter((o: any) => Math.hypot(o.pos.x - c.pos.x, o.pos.y - c.pos.y) <= 5).length,
      ptype: sim.offCall.kind, hist: s.hist.map((h: any) => ({ t: r2(h.t - sim.t), d: h.p[d.idx].map((v: number, i: number) => r2(i === 0 ? (v - c.pos.x) * dir : i === 1 ? (v - c.pos.y) * side : i === 2 ? v * dir : v * side)),
        c: h.p[c.idx].map((v: number, i: number) => r2(i === 0 ? (v - c.pos.x) * dir : i === 1 ? (v - c.pos.y) * side : i === 2 ? v * dir : v * side)) })) });
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) { const e = this.endSpot;
    for (const { cx, dir, ...x } of s.recs) events.push({ ...x, yardsAfter: e ? r2((e.x - cx) * dir) : null, endSideDist: e ? r2(Math.min(e.y, FIELD_WIDTH - e.y)) : null }); }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { game = FIRST + g; playNo = 0; simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${events.length} attempts`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, events })); console.log('attempts', events.length);
