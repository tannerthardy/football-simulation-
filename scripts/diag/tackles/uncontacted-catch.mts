// Uncontacted catches (Run Game, 2026-11-25, Integration), measurement only. Every completed pass to a non-QB on a
// scrimmage play, traced from the catch at 0.1 s: each defender's position relative to the carrier (along / across his
// heading), distance, achieved speed, commanded speed, top speed (vmax x speedScale), whether a reach / flight is live,
// and whether the man sees the carrier as carrying (honest picture). Kept when no tackle contact (no wrap) was made on
// the carrier after the catch. Usage: <flags> node --import tsx uncontacted-catch.mts GAMES OUT.json [FIRST=201]
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
const rows: any[] = []; let catches = 0;
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, ev = proto.event, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall?.kind === 'pass' && this.defCall ? { cur: null } : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const c = this.ball.kind === 'held' ? this.ball.carrier : null;
  if (!s.cur && c && c.team === this.offense[0].team && c !== this.qb && this.phase === 'live') { s.cur = { t0: this.t, x0: c.pos.x, dir: this.attackDir(c.team), c, car: c.player.position, wrapped: false, frames: [] }; catches++; }
  const cur = s.cur;
  if (cur && !cur.wrapped && c === cur.c && this.phase === 'live' && Math.round((this.t - cur.t0) * 100) % 10 === 0 && cur.frames.length < 60) {
    const cs = Math.hypot(c.vel.x, c.vel.y), ux = cs > 0.5 ? c.vel.x / cs : cur.dir, uy = cs > 0.5 ? c.vel.y / cs : 0;
    const ds: any[] = [];
    for (const d of this.defense) {
      const rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, dd = Math.hypot(rx, ry);
      if (dd > 8) continue;
      const cmd = this.intents[d.idx]?.vel;
      const seen = this.see(d, c);
      ds.push([d.player.position, d.idx, r2(dd), r2(rx * ux + ry * uy), r2(-rx * uy + ry * ux), r2(Math.hypot(d.vel.x, d.vel.y)), cmd ? r2(Math.hypot(cmd.x, cmd.y)) : null,
        r2(d.profile.vmax * (d.speedScale ?? 1)), T.reachOf?.(d) ? 1 : 0, d.body.support?.state?.[0], seen?.carrying === false ? 0 : 1, d.engagement ? 1 : 0, d.isDown(this.t) ? 1 : 0]);
    }
    cur.frames.push([r2(this.t - cur.t0), r2(cs), r2((c.pos.x - cur.x0) * cur.dir), ds]);
  }
  return out;
};
proto.event = function (this: any, type: string, a: any, b: any, note?: string) {
  const cur = st.get(this)?.cur;
  if (cur && b === cur.c && type === 'tackle_wrap') cur.wrapped = true;
  return ev.call(this, type, a, b, note);
};
proto.run = function (this: any) {
  const r = run.call(this); const cur = st.get(this)?.cur;
  if (cur && !cur.wrapped) { const endX = this.endSpot ? this.endSpot.x : cur.c.pos.x; rows.push({ car: cur.car, yac: r2((endX - cur.x0) * cur.dir), out: this.outcome?.kind ?? null, frames: cur.frames }); }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} uncontacted of ${catches}`); }
const env = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => /^[A-Z][A-Z0-9_]+$/.test(k) && (v === '0' || v === '1')).sort());
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, env, catches, rows }));
console.log('uncontacted', rows.length, 'of', catches);
