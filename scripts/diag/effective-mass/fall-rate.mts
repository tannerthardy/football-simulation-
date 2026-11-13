// Share of dropbacks on which a pass blocker (OL) falls before the throw, and OL falls per 100 dropbacks (Flex,
// 2026-11-13: the bisect of protector falls since PASS_ANCHOR). Flags from the environment.
// usage: [flags] node --import tsx scripts/diag/effective-mass/fall-rate.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
let drops = 0, withFall = 0, falls = 0, dlFalls = 0;
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    drops++;
    const ol = new Set(sim.offense.filter((a: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot)).map((a: any) => a.idx));
    const r = sim.run();
    const thr = sim.events.find((e: any) => e.type === 'throw')?.t ?? Infinity;
    const f = sim.events.filter((e: any) => e.type === 'fall' && ol.has(e.a) && e.t >= 0.5 && e.t <= thr);
    falls += f.length; if (f.length) withFall++;
    const dl = new Set(sim.defense.filter((a: any) => /^(DE|DT|NT)/.test(a.slot)).map((a: any) => a.idx));
    dlFalls += sim.events.filter((e: any) => e.type === 'fall' && dl.has(e.a) && e.t >= 0.5 && e.t <= thr).length;
    return r;
  } } });
}
console.log(`dropbacks ${drops} | with an OL fall before the throw ${(100 * withFall / drops).toFixed(1)}% | OL falls ${(100 * falls / drops).toFixed(1)} /100 dropbacks | DL falls ${(100 * dlFalls / drops).toFixed(1)} /100`);
