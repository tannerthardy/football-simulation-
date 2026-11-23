// Run-side approach rows (Run Game for Defense, 2026-11-23), measurement only. Default games; every designed run is
// traced from the handoff with Defense's read-only pursuit tap (scripts/diag/pursuit/pursuit-tap.mts at edcfef94: per
// 0.1 s each defender's position and velocity, his command, the stage that set his request, his steering point), plus,
// per tick here, which defenders were engaged by a blocker and who held the carrier. Analysis: run-approach.py.
// Usage: node --import tsx run-approach.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const tap: any = await import(`${W}/scripts/diag/pursuit/pursuit-tap.mts`); tap.install();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { readFileSync, writeFileSync, mkdtempSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const OUTSIDE_RUN = /oz|wz|stretch|toss|sweep|pitch|outside|jet|reverse|crack/i;
const tmp = mkdtempSync('/tmp/ra-'); const rows: any[] = [];
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
let game = 0, play = 0;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall?.kind === 'run' && this.defCall ? { tc: null as number | null, eng: {} as Record<string, string[]>, held: {} as Record<string, string[]> } : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  if (s.tc === null && bc && bc.team === sim.offense[0].team && bc !== sim.qb) s.tc = sim.t;
  if (s.tc !== null) {
    const k = (Math.round((sim.t - s.tc) * 100) / 100).toFixed(2);
    s.eng[k] = sim.defense.filter((d: any) => !!d.engagement).map((d: any) => d.slot);
    s.held[k] = sim.bond ? sim.bond.tacklers.map((d: any) => d.slot) : [];
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s && s.tc !== null) {
    const f = `${tmp}/x.json`; tap.dump(this, f);
    let J: any = null; try { J = JSON.parse(readFileSync(f, 'utf8')); } catch { J = null; }
    if (J && J.frames.length >= 2) {
      const call = this.offCall, label = `${call.run?.id ?? ''} ${call.label ?? ''}`;
      const mass = Object.fromEntries(this.agents.map((a: any) => [a.slot + (a.team === this.offense[0].team ? '@o' : '@d'), Math.round(a.profile.massKg)]));
      const pos = Object.fromEntries(this.defense.map((d: any) => [d.slot, d.player.position]));
      rows.push({ key: [FIRST + game, play], concept: call.run?.id ?? call.label ?? '?', ptype: OUTSIDE_RUN.test(label) ? 'outside run' : 'inside run',
        endX: this.endSpot ? Math.round((this.endSpot.x - this.los) * this.attackDir(this.offense[0].team) * 100) / 100 : null,
        mass, pos, eng: s.eng, held: s.held, ...J });
    }
  }
  play++;
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (; game < GAMES; game++) { simulateGame(home, away, { seed: FIRST + game }); console.error(`game ${game + 1}/${GAMES}: ${rows.length} runs`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, env: Object.fromEntries(['TACKLE_REACH', 'LUNGE_FLIGHT', 'DIVE_STANCE', 'REACH_TIME'].map(k => [k, process.env[k] ?? null])), rows }));
console.log('runs', rows.length);
