// Pass plays in the NFL record shape (out/mechanics/nfl-plays.jsonl.gz: players' side/group, 0.1 s xy frames from the
// snap, blocks as [OL index, DL index] pairs, events.pass_forward), plus the truth the tracking cannot see: falls =
// [OL index, time his support left 'up'] while the QB held the ball. For the NFL fall operator (olfall.py).
// usage: node --import tsx scripts/diag/effective-mass/pass-frames.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']), DL = /^(DE|DT|NT)/;
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const all = [...sim.offense, ...sim.defense];
    const players = all.map((a: any) => ({ side: a.team, group: OL.has(a.slot) ? 'OL' : DL.test(a.slot) ? 'DL' : a === sim.qb ? 'QB' : a.slot }));
    const dir = sim.attackDir('O'), los = sim.los;
    const xy: number[][] = [], blocks = new Set<string>(), falls: any[] = []; const wasUp = new Map<any, boolean>();
    let n = 0; const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      for (const e of sim.engagements ?? []) if (e.type === 'pass' && OL.has(e.blocker.slot) && DL.test(e.defender.slot)) blocks.add(`${all.indexOf(e.blocker)},${all.indexOf(e.defender)}`);
      for (const a of all) if (OL.has(a.slot)) { const up = a.body.support?.state === 'up'; if (wasUp.get(a) && !up && sim.throwAt < 0) falls.push([all.indexOf(a), +sim.t.toFixed(2)]); wasUp.set(a, up); }
      if (n++ % 2 === 0) xy.push(all.flatMap((a: any) => [+((a.pos.x - los) * dir).toFixed(2), +a.pos.y.toFixed(2)])); };
    const res = sim.run();
    console.log(JSON.stringify({ kind: 'pass', dt: 0.1, players, xy, events: sim.throwAt >= 0 ? { pass_forward: +sim.throwAt.toFixed(2) } : {}, blocks: [...blocks].map((b) => b.split(',').map(Number)), falls }));
    return res; } } });
}
