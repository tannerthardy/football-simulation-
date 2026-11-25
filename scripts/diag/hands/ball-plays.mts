// Defense: pass breakups, interceptions, deflections and "off his body" deflections by the defense over GAMES games
// (teams from Rng(201), seeds 201..), per arm. Usage: <flags> node --import tsx scripts/diag/hands/ball-plays.mts GAMES
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const GAMES = Number(process.argv[2] ?? 4);
const c: Record<string, number> = { passes: 0, completions: 0, pbu: 0, interception: 0, deflection: 0, offBody: 0 };
const proto = PlaySim.prototype as any, run = proto.run;
proto.run = function (this: any) {
  const r = run.call(this);
  if (!compilingPlan() && this.offCall?.kind === 'pass' && this.throwAt >= 0) {
    c.passes++; if (this.events.some((e: any) => e.type === 'catch')) c.completions++;
    for (const e of this.events) { const a = this.agents[e.a]; if (!a || a.team !== 'D') continue;
      if (e.type === 'pbu') c.pbu++; else if (e.type === 'interception') c.interception++; else if (e.type === 'deflection') { if (e.note === 'off his body') c.offBody++; else c.deflection++; } }
  }
  return r;
};
const rng = new Rng(201);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) simulateGame(home, away, { seed: 201 + g });
console.log(JSON.stringify({ games: GAMES, HANDS_SEEN: process.env.HANDS_SEEN ?? '-', ...c }));
