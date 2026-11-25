// LUNGE_FLIGHT probe (Run Game, 2026-11-23), measurement only; run with LUNGE_FLIGHT=1. Every launch (sim.diveAt from
// tryTackles): distance and reach at launch, both bodies' speeds, the tackler's speed headroom (the dive's push-off adds
// min(1.5, vmax - speed) yd/s), how the carrier is moving relative to him; then how it ended (grab, or short, with the
// closest the carrier came to his standing reach in the flight).
// Usage: LUNGE_FLIGHT=1 node --import tsx lunge-flight.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { flightOf, lungeForecast } = await import(`${W}/src/sim/tackle.ts`);
const { reachTo } = await import(`${W}/src/sim/tackle-reach.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const rows: any[] = [];
const open = new Map<any, any>();
const proto = PlaySim.prototype as any, dive = proto.diveAt, ev = proto.event;
proto.diveAt = function (this: any, a: any, dir: any) {
  const sim = this, c = sim.carrier;
  const out = dive.call(this, a, dir);
  const f = flightOf(a);
  if (f && f.sim === sim && f.t0 === sim.t && c && !compilingPlan()) {
    const dd = Math.hypot(c.pos.x - a.pos.x, c.pos.y - a.pos.y), cs = Math.hypot(c.vel.x, c.vel.y), ds = Math.hypot(a.vel.x, a.vel.y);
    const rx = c.pos.x - a.pos.x, ry = c.pos.y - a.pos.y;
    const sep = ((c.vel.x - a.vel.x) * rx + (c.vel.y - a.vel.y) * ry) / (dd || 1);
    const ux = cs > 1 ? c.vel.x / cs : 1, uy = cs > 1 ? c.vel.y / cs : 0;
    const bearing = Math.acos(Math.max(-1, Math.min(1, (-rx * ux + -ry * uy) / (dd || 1)))) * 180 / Math.PI;
    const r = { from: f.from, def: a.player.position, dd: r3(dd), arms: r3(reachTo(a, c, 1)), over: r3(dd - reachTo(a, c, 1)), cs: r3(cs), ds: r3(ds),
      headroom: r3(a.profile.vmax - ds), fGap: f.forecast ? r3(f.forecast.gap) : null, fAt: f.forecast ? r3(f.forecast.at) : null, trueGap: r3(lungeForecast(sim, a, c, c.pos, c.vel).gap), sep: r3(sep), asked: r3(Math.hypot(sim.intents[a.idx]?.vel.x ?? 0, sim.intents[a.idx]?.vel.y ?? 0)), cmd: r3(Math.hypot(sim.cmds?.[a.idx]?.vel.x ?? 0, sim.cmds?.[a.idx]?.vel.y ?? 0)), effort: sim.intents[a.idx]?.effort ?? null, bearing: Math.round(bearing), aimOff: null as any, end: null as any, closestOver: null as any, t0: sim.t };
    open.set(a, r);
  }
  return out;
};
proto.event = function (this: any, type: string, a: any, b: any, note?: string) {
  const r = a ? open.get(a) : undefined;
  if (r) {
    if (type === 'missed_tackle' && (note === 'lunge short' || note === 'dive short')) {
      const f = flightOf(a); r.end = 'short'; r.closestOver = f ? r3(f.closest - f.closestArms) : null; r.dur = r3(this.t - r.t0);
      rows.push(r); open.delete(a);
    } else if (type === 'missed_tackle' || type === 'tackle_wrap') {
      r.end = type === 'missed_tackle' ? 'whiff' : 'grab'; r.dur = r3(this.t - r.t0); rows.push(r); open.delete(a);
    }
  }
  return ev.call(this, type, a, b, note);
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); open.clear(); console.error(`game ${g + 1}/${GAMES}: ${rows.length} launches`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, rows }));
console.log('launches', rows.length);
