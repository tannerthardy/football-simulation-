// Finish trace (Run Game, 2026-11-23), measurement only. Every initial wrap (tackle_wrap 'initial') on a scrimmage
// carrier: approach and momentum at the wrap (along the carrier's path: tackler momentum against the carrier's), then
// tick by tick to the end of the play: the carrier's progress along his path, speed, support state, the bond's
// tacklers, each holder's support state, grip, legs share and hold force. Summary per wrap: forward yards in 0.5 / 1.0 s
// and to the end, time to the carrier falling, down, and to the whistle; how many tacklers had joined; the cause of the
// end. Usage: node --import tsx finish-trace.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { writeFileSync } = await import('node:fs');
const { deviationFraction, supportParams } = await import(`${W}/src/physics/support.ts`);
const { fatigueFactor } = await import(`${W}/src/physics/kinematics.ts`);
const { CONTACT_SCALE } = await import(`${W}/src/physics/world.ts`);
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const rows: any[] = [];
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) {
    s = !compilingPlan() && this.offCall && this.defCall && (this.offCall.kind === 'run' || this.offCall.kind === 'pass')
      ? { seen: this.events.length, cur: null as any } : null;
    st.set(this, s);
  }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this;
  for (; s.seen < sim.events.length; s.seen++) {
    const e = sim.events[s.seen];
    if (e.type !== 'tackle_wrap' || e.note !== 'initial' || s.cur) continue;
    const d = sim.agents[e.a], c = sim.agents[e.b];
    if (!d || !c || c.team !== sim.offense[0].team) continue;
    const cs = Math.hypot(c.vel.x, c.vel.y), dir = sim.attackDir(c.team);
    const ux = cs > 1 ? c.vel.x / cs : dir, uy = cs > 1 ? c.vel.y / cs : 0;
    const rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
    const bearing = Math.acos(Math.max(-1, Math.min(1, (rx * ux + ry * uy) / rd))) * 180 / Math.PI;
    const ang = Math.acos(Math.max(-1, Math.min(1, ((d.vel.x * c.vel.x + d.vel.y * c.vel.y) / ((Math.hypot(d.vel.x, d.vel.y) * cs) || 1))))) * 180 / Math.PI;
    const pc = c.profile.massKg * cs, pd = d.profile.massKg * Math.hypot(d.vel.x, d.vel.y);
    // Tackler momentum against the carrier's travel (positive = opposing him).
    const against = -d.profile.massKg * (d.vel.x * ux + d.vel.y * uy);
    s.cur = { t0: sim.t, x0: c.pos.x, y0: c.pos.y, ux, uy, dir, origin: sim.bond?.holds?.get(d)?.origin ?? null, def: d.player.position, car: c.player.position,
      massRatio: r3(d.profile.massKg / c.profile.massKg), momRatio: r3(pd / Math.max(1, pc)), againstRatio: r3(against / Math.max(1, pc)),
      bearing: Math.round(bearing), approach: Math.round(ang), cs: r3(cs), ds: r3(Math.hypot(d.vel.x, d.vel.y)), dd: r3(rd), legs0: r3(sim.bond?.holds?.get(d)?.legs ?? 0),
      grip0: r3(sim.bond?.grip?.get(d) ?? 0), fallAt: null, downAt: null, maxTacklers: 1, secondAt: null, fwd05: null, fwd10: null, trace: [], carrier: c };
  }
  const cur = s.cur;
  if (cur && sim.phase === 'live') {
    const c = cur.carrier, el = sim.t - cur.t0;
    const fwd = (c.pos.x - cur.x0) * cur.ux + (c.pos.y - cur.y0) * cur.uy;
    const n = sim.bond?.tacklers.length ?? 0;
    if (n > cur.maxTacklers) cur.maxTacklers = n;
    if (n >= 2 && cur.secondAt === null) cur.secondAt = r3(el);
    const state = c.body.support?.state;
    if (state === 'falling' && cur.fallAt === null) cur.fallAt = r3(el);
    if (state === 'down' && cur.downAt === null) cur.downAt = r3(el);
    if (cur.fwd05 === null && el >= 0.5 - 1e-9) cur.fwd05 = r3(fwd);
    if (cur.fwd10 === null && el >= 1.0 - 1e-9) cur.fwd10 = r3(fwd);
    if (cur.trace.length < 40) {
      const holds = sim.bond ? [...(sim.bond.holds ?? new Map())].map(([d, j]: any) => {
        const torso = c.profile.radius + d.profile.radius, centers = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
        const arm = Math.min(centers, (j.hold ?? centers) + (1 - CONTACT_SCALE) * torso);
        return [d.player.position, d.body.support?.state?.[0], r3(sim.bond.grip?.get(d) ?? 0), r3(j.legs), r3(j.force ?? 0), j.slipping ? 1 : 0, r3(arm - torso), r3(centers - torso)];
      }) : [];
      const sup = c.body.support, cmd = sim.cmds?.[c.idx]?.vel;
      const dev = sup && sup.state === 'up' ? deviationFraction(sup, supportParams(c.profile), fatigueFactor(c.body.energy)) : null;
      cur.trace.push([r3(el), r3(fwd), r3(Math.hypot(c.vel.x, c.vel.y)), state?.[0], holds, dev === null ? null : r3(dev), cmd ? r3(Math.hypot(cmd.x, cmd.y)) : null]);
    }
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s?.cur) {
    const cur = s.cur, c = cur.carrier;
    const endX = this.endSpot ? this.endSpot.x : c.pos.x;
    cur.fwdEnd = r3((endX - cur.x0) * cur.dir);
    cur.whistle = r3(this.t - cur.t0);
    cur.outcome = this.outcome?.kind ?? this.outcome ?? null;
    delete cur.carrier; rows.push(cur);
  }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} wraps`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, env: Object.fromEntries(['TACKLE_REACH', 'LUNGE_FLIGHT', 'DIVE_STANCE', 'REACH_TIME'].map(k => [k, process.env[k] ?? null])), rows }));
console.log('wraps', rows.length);
