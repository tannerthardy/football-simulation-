// Backer blitzers on dropbacks: true depth off the ball and downhill speed, and the line's seen picture (nearest OL observer), at 0.2-0.8 s.
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const R: Record<string, number[]> = {}; const push = (k: string, v: number) => (R[k] ??= []).push(v);
for (let s = 11; s < 11 + 2 * 3; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const bl = sim.defense.filter((d: any) => d.behavior?.kind === 'blitz' && /LB/.test(d.slot)); if (!bl.length) return undefined;
    const dir = sim.attackDir('O'); const ol = sim.offense.filter((o: any) => /^(LT|LG|C|RG|RT)$/.test(o.slot));
    const TS = [0.2, 0.4, 0.6, 0.8]; let i = 0; const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (i < TS.length && sim.t >= TS[i] - 1e-9) { for (const d of bl) { const obs = ol.sort((a: any, b: any) => Math.abs(a.pos.y - d.pos.y) - Math.abs(b.pos.y - d.pos.y))[0];
      const sn = sim.see(obs, d); push(`${TS[i]} depth`, (d.pos.x - sim.los) * dir); push(`${TS[i]} down`, -d.vel.x * dir); push(`${TS[i]} seen depth`, (sn.pos.x - sim.los) * dir); push(`${TS[i]} seen down`, -sn.vel.x * dir); push(`${TS[i]} raw seen vx`, sn.vel.x); push(`${TS[i]} dir`, dir); } i++; } };
    return sim.run(); } } });
}
const q = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return [0.25, 0.5, 0.75].map((x) => s[Math.floor(x * (s.length - 1))].toFixed(2)).join('/'); };
for (const t of [0.2, 0.4, 0.6, 0.8]) console.log(`${t}s n${R[`${t} depth`].length} depth ${q(R[`${t} depth`])} downhill ${q(R[`${t} down`])} | seen depth ${q(R[`${t} seen depth`])} seen downhill ${q(R[`${t} seen down`])} | raw seen vx ${q(R[`${t} raw seen vx`])} dir ${q(R[`${t} dir`])}`);
