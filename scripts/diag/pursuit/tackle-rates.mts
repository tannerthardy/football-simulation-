// Missed and broken tackles in default games (2026-11-23), measurement only, for matching against NFL charting once the
// definitions table arrives. Usage: node --import tsx tackle-rates.mts GAMES OUT.json [FIRST_SEED=201]
// Engine events (src/sim/tackle.ts):
//  - missed_tackle: an attempt (reach, dive or grab) that never established a hold.
//  - tackle_wrap 'initial': an attempt that established a hold (an 'assist' wrap is a second tackler joining).
//  - broken_tackle: an established hold that the carrier escaped.
// Attempts = missed_tackle + tackle_wrap(initial). Each event is recorded with the carrier and defender, the play type,
// open field vs traffic, approach bearing in the carrier's frame, both speeds and the closing speed, and the carrier's
// yards from the event to the end of the play. Sacks (a pocket QB before the throw) are kept apart (pocket=true).
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 4), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const OUTSIDE_RUN = /oz|wz|stretch|toss|sweep|pitch|outside|jet|reverse|crack/i;
const events: any[] = []; const plays: any[] = [];
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
function playType(sim: any): string {
  const call = sim.offCall;
  if (!call) return 'other';
  if (call.kind === 'run') return OUTSIDE_RUN.test(`${call.run?.id ?? ''} ${call.label ?? ''}`) ? 'outside run' : 'inside run';
  if (call.pass?.screen) return 'screen';
  return 'pass';
}
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) {
    s = !compilingPlan() && this.offCall && this.defCall ? { seen: this.events.length, recs: [] as any[] } : null;
    st.set(this, s);
  }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this;
  for (; s.seen < sim.events.length; s.seen++) {
    const e = sim.events[s.seen];
    if (e.type !== 'missed_tackle' && e.type !== 'tackle_wrap' && e.type !== 'broken_tackle') continue;
    if (e.type === 'tackle_wrap' && e.note === 'assist') continue;
    const [d, c] = e.type === 'broken_tackle' ? [sim.agents[e.b], sim.agents[e.a]] : [sim.agents[e.a], sim.agents[e.b]];
    if (!d || !c) continue;
    // Scrimmage carriers only: the offense's ball (returns after a turnover and kicks are left out).
    if (c.team !== sim.offense[0].team || (sim.offCall.kind !== 'run' && sim.offCall.kind !== 'pass')) continue;
    const dir = sim.attackDir(c.team);
    const cs = Math.hypot(c.vel.x, c.vel.y), ds = Math.hypot(d.vel.x, d.vel.y);
    const rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
    // Bearing of the defender in the carrier's frame (0 = straight ahead of his travel; +x when he is slower than 1 yd/s).
    const ux = cs > 1 ? c.vel.x / cs : dir, uy = cs > 1 ? c.vel.y / cs : 0;
    const bearing = Math.acos(Math.max(-1, Math.min(1, (rx * ux + ry * uy) / rd))) * 180 / Math.PI;
    const closing = -((d.vel.x - c.vel.x) * rx + (d.vel.y - c.vel.y) * ry) / rd;
    const near5 = sim.defense.filter((o: any) => Math.hypot(o.pos.x - c.pos.x, o.pos.y - c.pos.y) <= 5).length;
    const pocket = c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled;
    s.recs.push({ type: e.type, detail: e.note ?? null, t: r2(e.t), carrierPos: c.player.position, carrierSlot: c.slot, defPos: d.player.position,
      defSlot: d.slot, x: r2((c.pos.x - sim.los) * dir), bearing: Math.round(bearing), cs: r2(cs), ds: r2(ds), closing: r2(closing), near5, pocket,
      playType: c === sim.qb && sim.isPass && !pocket ? 'qb scramble' : playType(sim) });
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) {
    const dir = this.attackDir(this.offense[0].team);
    const endX = this.endSpot ? (this.endSpot.x - this.los) * dir : null;
    const pt = playType(this);
    const reception = this.isPass && !!this.stats.completed && !this.scrambled;
    const rush = !this.isPass || !!this.scrambled;
    plays.push({ type: pt, reception, rush, n: s.recs.length, missed: s.recs.filter((x: any) => x.type === 'missed_tackle' && !x.pocket).length,
      broken: s.recs.filter((x: any) => x.type === 'broken_tackle' && !x.pocket).length, endX: endX !== null ? r2(endX) : null,
      contactX: this.firstContactX != null ? r2((this.firstContactX - this.los) * dir) : null });
    for (const x of s.recs) events.push({ ...x, yardsAfter: endX !== null ? r2(endX - x.x) : null });
  }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${events.length} events, ${plays.length} plays`); }
// The flag set, so a comparison between outputs can be checked as paired (every env var in UPPER_SNAKE with value 0/1).
const env = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => /^[A-Z][A-Z0-9_]+$/.test(k) && (v === '0' || v === '1')).sort());
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, env, events, plays }));
console.log('events', events.length, 'plays', plays.length);
