// The man ahead on uncontacted catches (Run Game, 2026-11-25, Integration), measurement only. Every completed pass to a
// non-QB on a scrimmage play, from the catch at 0.05 s until the play ends: the carrier's position and velocity, and for
// every defender his position, velocity, commanded velocity, top speed (vmax x speedScale), tau, energy, whether his
// picture shows the carrier carrying, engaged, down, a reach live. Kept only when nobody wrapped the carrier after the
// catch. Analysis (ahead-man.py): feasibility of an intercept at his own top speed from where he stood when he first saw
// the catch, against the carrier's actual path; then gather / angle / late / not feasible.
// Usage: <flags> node --import tsx ahead-man.mts GAMES OUT.json [FIRST=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const T: any = await import(`${W}/src/sim/tackle.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const rows: any[] = [], all: any[] = []; let catches = 0, gameSeed = 0, playNo = 0;
// Gate log (only with the uncommitted gate tally in tackle.ts, which calls globalThis.__gate): every tackle gate a defender
// within 2.2 yd of the current catcher passes or fails, by tick.
let liveCur: any = null;
(globalThis as any).__gate = (sim: any, d: any, c: any, why: string) => {
  const cur = liveCur; if (!cur || sim !== cur.sim || c !== cur.c) return;
  const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y); if (dd > 2.2) return;
  cur.gates.push([Math.round((sim.t - cur.t0) * 100) / 100, d.slot, Math.round(dd * 100) / 100, why]);
};
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, ev = proto.event, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall?.kind === 'pass' && this.defCall ? { cur: null } : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const c = this.ball.kind === 'held' ? this.ball.carrier : null;
  if (!s.cur && c && c.team === this.offense[0].team && c !== this.qb && this.phase === 'live') {
    s.cur = { seed: gameSeed, play: playNo, catchT: r2(this.t), offLabel: this.offCall?.label ?? null, defLabel: this.defCall?.label ?? null, carSlot: c.slot, t0: this.t, x0: c.pos.x, dir: this.attackDir(c.team), c, car: c.player.position, carVmax: r2(c.profile.vmax * (c.speedScale ?? 1)), carEnergy: r2(c.body.energy),
      def: this.defense.map((d: any) => ({ slot: d.slot, pos: d.player.position, vmax: r2(d.profile.vmax * (d.speedScale ?? 1)), tau: r2(d.profile.tau), reach: r2(d.profile.reach), radius: r2(d.profile.radius), energy: r2(d.body.energy) })),
      carRadius: c.profile.radius, wrapped: false, frames: [], gates: [], devents: [], first: null, sim: this };
    liveCur = s.cur;
    catches++;
  }
  const cur = s.cur;
  if (cur && !cur.wrapped && c === cur.c && this.phase === 'live' && cur.frames.length < 120) {
    cur.frames.push([r2(this.t - cur.t0), r2(c.pos.x), r2(c.pos.y), r2(c.vel.x), r2(c.vel.y), this.defense.map((d: any) => {
      const cmd = this.intents[d.idx]?.vel, seen = this.see(d, c);
      return [r2(d.pos.x), r2(d.pos.y), r2(d.vel.x), r2(d.vel.y), cmd ? r2(cmd.x) : null, cmd ? r2(cmd.y) : null, seen?.carrying === true ? 1 : 0, d.engagement ? 1 : 0, d.isDown(this.t) ? 1 : 0, T.reachOf?.(d) ? 1 : 0];
    })]);
  }
  return out;
};
proto.event = function (this: any, type: string, a: any, b: any, note?: string) {
  const cur = st.get(this)?.cur;
  if (cur && b === cur.c && (type === 'missed_tackle' || type === 'broken_tackle' || type === 'tackle_wrap')) cur.devents.push([Math.round((this.t - cur.t0) * 100) / 100, a?.slot, type, note ?? null]);
  if (cur && b === cur.c && type === 'tackle_wrap' && note === 'initial' && !cur.first) { const dd = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y), h = b.profile.radius + a.profile.radius + Math.max(0, a.profile.reach - a.profile.radius); cur.first = { slot: a.slot, t: r2(this.t - cur.t0), dd: r2(dd), over: r2(dd - h) }; }
  if (cur && b === cur.c && type === 'tackle_wrap') cur.wrapped = true;
  return ev.call(this, type, a, b, note);
};
proto.run = function (this: any) {
  if (!compilingPlan() && this.offCall && this.defCall) playNo++;
  const r = run.call(this); const cur = st.get(this)?.cur;
  if (cur) { liveCur = null; all.push({ seed: cur.seed, play: cur.play, catchT: cur.catchT, offLabel: cur.offLabel, defLabel: cur.defLabel, carSlot: cur.carSlot, x0: r2(cur.x0), wrapped: cur.wrapped, first: cur.first, yac: r2(((this.endSpot ? this.endSpot.x : cur.c.pos.x) - cur.x0) * cur.dir) }); delete cur.sim; }
  if (cur && !cur.wrapped) {
    const endX = this.endSpot ? this.endSpot.x : cur.c.pos.x; const c = cur.c; delete cur.c;
    rows.push({ ...cur, yac: r2((endX - cur.x0) * cur.dir), out: this.outcome?.kind ?? null });
  }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { gameSeed = FIRST + g; playNo = 0; simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} uncontacted of ${catches}`); }
const env = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => /^[A-Z][A-Z0-9_]+$/.test(k) && (v === '0' || v === '1')).sort());
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, env, catches, rows, all }));
console.log('uncontacted', rows.length, 'of', catches);
