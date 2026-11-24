// REACH_TIME trace (Run Game, 2026-11-24), measurement only; run with REACH_TIME=1. Every reach on a scrimmage carrier,
// tick by tick from its start to its end (grab or miss): the centre distance, the closing speed, both speeds, the
// carrier's lateral velocity relative to the line, and whether the two torsos are in contact (World contacts). Summary
// per reach: closing at the start, closest distance in the window, contact seen, outcome.
// Usage: REACH_TIME=1 node --import tsx reach-trace.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { reachOf, aimOf, reachDiag } = await import(`${W}/src/sim/tackle.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const rows: any[] = [];
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, ev = proto.event;
function snap(sim: any, d: any, c: any) {
  const rx = c.pos.x - d.pos.x, ry = c.pos.y - d.pos.y, dd = Math.hypot(rx, ry) || 1;
  const vx = c.vel.x - d.vel.x, vy = c.vel.y - d.vel.y;
  const touching = !!sim.lastStep?.contacts?.some((h: any) => (h.i === d.idx && h.j === c.idx) || (h.i === c.idx && h.j === d.idx));
  return [r3(sim.t), r3(dd), r3(-(vx * rx + vy * ry) / dd), r3((-vx * ry + vy * rx) / dd), r3(Math.hypot(c.vel.x, c.vel.y)), r3(Math.hypot(d.vel.x, d.vel.y)), touching ? 1 : 0, d.body.support?.state?.[0], c.body.support?.state?.[0]];
}
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall && this.defCall ? new Map<any, any>() : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const c = this.ball.kind === 'held' ? this.ball.carrier : null;
  if (!c || c.team !== this.offense[0].team) return out;
  for (const d of this.defense) {
    const r = reachOf(d);
    if (r && r.sim === this) {
      let x = s.get(d);
      if (!x) { x = { t0: r.t0, arrive: r3(r.arrive - r.t0), limit: r3(r.limit), engaged: r.engaged, def: d.player.position, car: c.player.position, ticks: [] }; s.set(d, x); }
      x.ticks.push(snap(this, d, c));
    }
  }
  return out;
};
proto.event = function (this: any, type: string, a: any, b: any, note?: string) {
  const s = st.get(this);
  if (s && a && s.has(a) && (type === 'tackle_wrap' || (type === 'missed_tackle' && note === 'reach'))) {
    const x = s.get(a); s.delete(a);
    x.end = type === 'tackle_wrap' ? 'grab' : 'miss';
    x.aim = aimOf ? (aimOf(a)?.region ?? null) : null;
    x.legs = type === 'tackle_wrap' ? (this.bond?.holds?.get(a)?.legs ?? null) : null;
    x.final = b ? snap(this, a, b) : null;
    const T = x.ticks.length ? x.ticks : [x.final];
    x.closing0 = T[0]?.[2] ?? null; x.closest = Math.min(...T.map((t: any) => t[1]));
    x.touched = T.some((t: any) => t[6] === 1);
    rows.push(x);
  }
  return ev.call(this, type, a, b, note);
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} reaches`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, sweptMeets: reachDiag?.sweptMeets ?? null, rows }));
console.log('reaches', rows.length);
