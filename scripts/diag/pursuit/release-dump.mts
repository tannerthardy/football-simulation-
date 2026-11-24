// Block-release plays from default games (2026-11-24), for release-op.py. Every scrimmage run and pass: all 22 players at
// 10 Hz from the snap to the end, x from the LOS toward the offense's goal; car = the ball holder other than a pocket QB.
// Usage: node --import tsx release-dump.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const plays: any[] = []; const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall && (this.offCall.kind === 'run' || this.offCall.kind === 'pass') ? { next: 0, frames: [] as any[], dir: this.attackDir(this.offense[0].team) } : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this;
  if (sim.t >= s.next - 1e-9) {
    s.next += 0.1;
    const P = (a: any) => [r2((a.pos.x - sim.los) * s.dir), r2(a.pos.y)];
    const bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
    const pocket = bc === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled;
    const car = bc && bc.team === sim.offense[0].team && !pocket ? bc.slot : null;
    const f: any = { t: r2(sim.t), car, off: {}, def: {} };
    for (const o of sim.offense) f.off[o.slot] = P(o);
    for (const d of sim.defense) f.def[d.slot] = P(d);
    s.frames.push(f);
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s && s.frames.length >= 8) plays.push({ ptype: this.offCall.kind, dpos: Object.fromEntries(this.defense.map((d: any) => [d.slot, d.player.position])), frames: s.frames });
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${plays.length} plays`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, plays })); console.log('plays', plays.length);
