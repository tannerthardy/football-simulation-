// Hold life trace (Run Game, 2026-11-23), measurement only. Every grasp joint made in default games, from the wrap to
// its end: approach at the wrap (carrier frame), the joint's geometry and capacity, the load it carried each tick, and
// how it ended (broken: slid past reach / geometry / hang; or held to the whistle).
// Usage: node --import tsx hold-trace.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const holds: any[] = [];
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
function frame(c: any, d: any) {
  const cs = Math.hypot(c.vel.x, c.vel.y);
  const rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
  const ux = cs > 1 ? c.vel.x / cs : 1, uy = cs > 1 ? c.vel.y / cs : 0;
  const bearing = Math.acos(Math.max(-1, Math.min(1, (rx * ux + ry * uy) / rd))) * 180 / Math.PI;
  // Relative velocity of the carrier away from the holder, along the line and along the carrier's path.
  const vx = c.vel.x - d.vel.x, vy = c.vel.y - d.vel.y;
  return { bearing: Math.round(bearing), cs: r3(cs), ds: r3(Math.hypot(d.vel.x, d.vel.y)), dist: r3(rd),
    sep: r3((vx * -rx + vy * -ry) / rd), alongPath: r3(vx * ux + vy * uy), across: r3(-vx * uy + vy * ux) };
}
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) {
    s = !compilingPlan() && this.offCall && this.defCall ? { live: new Map<any, any>(), seen: this.events.length } : null;
    st.set(this, s);
  }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, bond = sim.bond;
  const now = new Set<any>();
  if (bond) for (const [d, j] of bond.holds ?? []) {
    now.add(j);
    let h = s.live.get(j);
    const c = bond.carrier;
    if (!h) {
      h = { t0: sim.t, origin: j.origin, def: d.player.position, car: c.player.position, mass: [r3(d.profile.massKg), r3(c.profile.massKg)],
        radii: [r3(d.profile.radius), r3(c.profile.radius)], reachProfile: r3(d.profile.reach), jointReach: r3(j.reach), ground: j.ground ? r3(j.ground) : null,
        hold0: r3(j.hold), cap0: r3(j.capacity), legs0: r3(j.legs), lock0: r3(j.lock ?? 0), grip0: r3(bond.grip?.get(d) ?? 0),
        oneArm: !!bond.oneArm?.has(d), at: frame(c, d), ticks: 0, slipTicks: 0, maxLoad: 0, hold: [], d, c, j };
      s.live.set(j, h);
    }
    h.ticks++;
    if (j.slipping) h.slipTicks++;
    const cap = Math.max(1e-9, j.capacity);
    h.maxLoad = Math.max(h.maxLoad, (j.force ?? 0) / cap);
    h.sumN = (h.sumN ?? 0) + Math.abs(j.normalForce ?? 0); h.sumT = (h.sumT ?? 0) + Math.abs(j.tangentForce ?? 0);
    if (h.ticks <= 40) h.hold.push([r3(sim.t - h.t0), r3(j.hold ?? 0), r3(j.reach), r3(j.capacity), r3((j.force ?? 0)), j.slipping ? 1 : 0,
      d.body.support?.state ?? '?', r3(j.legs), r3(Math.hypot(c.vel.x, c.vel.y)), r3(j.normalForce ?? 0), r3(j.tangentForce ?? 0)]);
    h.last = { t: sim.t, hold: r3(j.hold ?? 0), reach: r3(j.reach), ground: j.ground ? r3(j.ground) : null, cap: r3(j.capacity), lock: r3(j.lock ?? 0),
      legs: r3(j.legs), grip: r3(bond.grip?.get(d) ?? 0), control: r3(bond.control?.get(d) ?? 0), holder: d.body.support?.state, carrier: c.body.support?.state,
      broken: !!j.broken, slipping: !!j.slipping, at: frame(c, d) };
  }
  for (const [j, h] of s.live) {
    if (now.has(j)) continue;
    // The joint left the bond this tick: broken (updateBond counted it) or released (whistle, fumble, carrier change).
    const end = sim.events.slice(s.seen).find((e: any) => e.type === 'broken_tackle' && sim.agents[e.b] === h.d);
    h.end = end ? 'broken' : 'released';
    h.cause = end ? (h.last.hold > (h.last.holder === 'up' ? h.last.reach : (h.last.ground ?? h.last.reach)) - 1e-3 ? 'slid' : 'other') : null;
    h.dur = r3(h.last.t - h.t0);
    h.phase = sim.phase; h.down = sim.events.slice(s.seen).some((e: any) => e.type === 'tackle' || e.type === 'down');
    delete h.d; delete h.c; delete h.j;
    holds.push(h);
    s.live.delete(j);
  }
  s.seen = sim.events.length;
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) for (const [, h] of s.live) {
    h.end = 'whistle'; h.cause = null; h.dur = r3(h.last.t - h.t0); h.phase = this.phase;
    delete h.d; delete h.c; delete h.j; holds.push(h);
  }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${holds.length} holds`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, env: { TACKLE_REACH: process.env.TACKLE_REACH ?? null }, holds }));
console.log('holds', holds.length);
