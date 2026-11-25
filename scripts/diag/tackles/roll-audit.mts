// Rating-roll audit (Run Game, 2026-11-23), measurement only. With TKL_WHIFF off, an open-field reach misses on
// rng.chance(pMiss), pMiss from ratings (tackle.ts attempt). At every initial attempt event (missed_tackle or
// tackle_wrap 'initial'), this records the roll's verdict beside what the bodies say: TKL_WHIFF's margin (the carrier's
// predicted body beyond the hands' reach over the reach window; + = out of reach), and the pMiss terms recomputed from
// the same state. Usage: node --import tsx roll-audit.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { whiffMargin } = await import(`${W}/src/sim/tackle.ts`);
const { reachTo } = await import(`${W}/src/sim/tackle-reach.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const rows: any[] = [];
const proto = PlaySim.prototype as any, ev = proto.event;
proto.event = function (this: any, type: string, a: any, b: any, note?: string) {
  const sim = this;
  if ((type === 'missed_tackle' || (type === 'tackle_wrap' && note === 'initial')) && !compilingPlan() && sim.offCall && sim.defCall
    && a && b && b.team === sim.offense[0].team) {
    const d = a, c = b;
    const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
    const engaged = !!d.engagement;
    const arms = reachTo(d, c, 1), range = arms + 0.45;
    const lunged = !engaged && dd > arms;
    const limit = lunged ? range : arms;
    const window = note === 'dive' ? 0.3 : 0.2;
    const pocket = c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled;
    const cs = Math.hypot(c.vel.x, c.vel.y);
    const rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
    const ux = cs > 1 ? c.vel.x / cs : 1, uy = cs > 1 ? c.vel.y / cs : 0;
    const bearing = Math.acos(Math.max(-1, Math.min(1, (rx * ux + ry * uy) / rd))) * 180 / Math.PI;
    const closing = -((d.vel.x - c.vel.x) * -rx + (d.vel.y - c.vel.y) * -ry) / rd * -1;
    let margin: number | null = null;
    // whiffMargin reads the tracking channel, which records that the pair was asked about; keep the game unperturbed.
    const saved = sim.trackSight ? new Map([...sim.trackSight].map(([k, v]: any) => [k, v.map((x: any) => ({ ...x }))])) : undefined;
    // An initial wrap's bond was just made by this attempt; the margin is judged as before it (no bond).
    const bond = sim.bond; if (type === 'tackle_wrap') sim.bond = null;
    try { margin = whiffMargin(sim, d, c, limit, engaged, window); } catch { margin = null; }
    sim.bond = bond;
    sim.trackSight = saved;
    const T = d.r('tackling') * 0.85 + d.r('pursuit') * 0.15, E = c.r('elusiveness');
    const near4 = sim.opponents(c).filter((o: any) => Math.hypot(o.pos.x - c.pos.x, o.pos.y - c.pos.y) < 4).length;
    rows.push({ type, note: note ?? null, engaged, lunged, pocket, dd: r3(dd), arms: r3(arms), margin: margin === null ? null : r3(margin),
      bearing: Math.round(bearing), cs: r3(cs), ds: r3(Math.hypot(d.vel.x, d.vel.y)), closing: r3(closing), T: r3(T), E: r3(E), open: near4 <= 1,
      bonded: !!sim.bond && type === 'missed_tackle' });
  }
  return ev.call(this, type, a, b, note);
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} attempts`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, env: { TACKLE_REACH: process.env.TACKLE_REACH ?? null, LUNGE_FLIGHT: process.env.LUNGE_FLIGHT ?? null }, rows }));
console.log('attempts', rows.length);
