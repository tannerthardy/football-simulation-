// Receptions (Run Game, 2026-11-25, Integration's card e139), measurement only. Every completed pass to a non-QB on a
// scrimmage play: at the catch tick, the nearest defender (the man at the catch) and his distance and closing speed;
// then that man's fate: his min distance after the catch, whether he started a reach (REACH_TIME) or a lunge, his first
// tackle event (grab, missed: reach / lunge short / other, broken). The first initial wrap after the catch, by anyone:
// centre distance against the honest standing arm (both torsos + arm span) and the lunge-only band (+ GROUND_STRETCH).
// YAC to the end spot. Usage: <flags> node --import tsx reception-contact.mts GAMES OUT.json [FIRST=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { GROUND_STRETCH } = await import(`${W}/src/physics/world.ts`);
const T: any = await import(`${W}/src/sim/tackle.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const honestArm = (a: any, b: any) => b.profile.radius + a.profile.radius + Math.max(0, a.profile.reach - a.profile.radius);
const rows: any[] = [];
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, ev = proto.event, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall?.kind === 'pass' && this.defCall ? { cur: null } : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const c = this.ball.kind === 'held' ? this.ball.carrier : null;
  if (!s.cur && c && c.team === this.offense[0].team && c !== this.qb && this.phase === 'live') {
    let best: any = null, bd = Infinity;
    for (const d of this.defense) { const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y); if (dd < bd) { bd = dd; best = d; } }
    const rx = c.pos.x - best.pos.x, ry = c.pos.y - best.pos.y;
    s.cur = { t0: this.t, x0: c.pos.x, dir: this.attackDir(c.team), car: c.player.position, carrier: c, man: best, manPos: best.player.position,
      d0: r3(bd), closing0: r3(-((c.vel.x - best.vel.x) * rx + (c.vel.y - best.vel.y) * ry) / (bd || 1)), cs0: r3(Math.hypot(c.vel.x, c.vel.y)), ds0: r3(Math.hypot(best.vel.x, best.vel.y)),
      manMin: bd, manReach: false, manLunge: false, manFate: null, first: null };
  }
  const cur = s.cur;
  if (cur && this.phase === 'live' && c === cur.carrier) {
    const d = cur.man, dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
    if (dd < cur.manMin) cur.manMin = dd;
    if (T.reachOf?.(d)) cur.manReach = true;
    if (d.body.support?.state === 'falling' && !cur.manFate) cur.manLunge = true;
  }
  return out;
};
proto.event = function (this: any, type: string, a: any, b: any, note?: string) {
  const s = st.get(this), cur = s?.cur;
  if (cur && b === cur.carrier) {
    if (a === cur.man && !cur.manFate && (type === 'tackle_wrap' || type === 'missed_tackle' || type === 'broken_tackle')) cur.manFate = type === 'tackle_wrap' ? 'grab' : `${type === 'missed_tackle' ? 'missed' : 'broken'}:${note ?? ''}`;
    if (type === 'tackle_wrap' && note === 'initial' && !cur.first) {
      const dd = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y), h = honestArm(a, b);
      const rx = b.pos.x - a.pos.x, ry = b.pos.y - a.pos.y;
      cur.first = { def: a.player.position, isMan: a === cur.man, t: r3(this.t - cur.t0), dd: r3(dd), over: r3(dd - h), closing: r3(-((b.vel.x - a.vel.x) * rx + (b.vel.y - a.vel.y) * ry) / (dd || 1)),
        cs: r3(Math.hypot(b.vel.x, b.vel.y)), bin: dd <= h ? 'arm' : dd <= h + GROUND_STRETCH ? 'lunge only' : 'beyond' };
    }
  }
  if (cur && a === cur.man && type === 'broken_tackle' && !cur.manBroke) cur.manBroke = note ?? 'broken';
  return ev.call(this, type, a, b, note);
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s?.cur) {
    const cur = s.cur, endX = this.endSpot ? this.endSpot.x : cur.carrier.pos.x;
    rows.push({ car: cur.car, man: cur.manPos, d0: cur.d0, closing0: cur.closing0, cs0: cur.cs0, ds0: cur.ds0, manMin: r3(cur.manMin), manReach: cur.manReach,
      manLunge: cur.manLunge, manFate: cur.manFate ?? 'none', manBroke: cur.manBroke ?? null, first: cur.first, yac: r3((endX - cur.x0) * cur.dir) });
  }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} receptions`); }
const env = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => /^[A-Z][A-Z0-9_]+$/.test(k) && (v === '0' || v === '1')).sort());
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, env, rows }));
console.log('receptions', rows.length);
