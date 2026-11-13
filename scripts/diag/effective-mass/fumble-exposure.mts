// GRASP_PATCH's two adverse rows (Integration's 16-game card, 2026-11-10): fumbles lost 0.53 -> 1.00 a team-game and
// missed + broken 0.28 -> 0.33 a play. The fumble is a die rolled in tackle.ts's attempt() per tackle attempt (odds from
// the hit's closing speed and the hitter's mass, x1.6 when the runner is already wrapped). This counts every fumble roll
// with its probability (by wrapping sim.dice), so exposure (rolls a play) and rate (mean probability a roll) separate;
// and per play: tackle attempts (first and assists), missed tackles, broken holds. Live games, runs and receptions
// apart. Settings at load: run per arm. usage: node --import tsx scripts/diag/effective-mass/fumble-exposure.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 6);
const acc: Record<string, any> = {};
const bucket = (k: string) => acc[k] ??= { plays: 0, rolls: 0, pSum: 0, assistRolls: 0, fumbles: 0, first: 0, assists: 0, missed: 0, broken: 0, lost: 0 };
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage') return undefined;
    const dice = sim.dice.bind(sim); let caught = false, rolls = 0, pSum = 0, assistRolls = 0;
    sim.dice = (label: string, who: any) => { const d = dice(label, who); if (label !== 'fumble') return d;
      return new Proxy(d, { get: (t: any, k: string) => k === 'chance' ? (p: number) => { rolls++; pSum += p; if (sim.bond) assistRolls++; return t.chance(p); } : (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) }); };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (sim.isPass && !caught && sim.carrier && sim.carrier.team === 'O' && sim.carrier !== sim.qb && sim.throwAt >= 0) caught = true; };
    const r = sim.run(); const st = sim.stats;
    const kind2 = !sim.isPass ? 'run' : caught ? 'reception' : 'other pass';
    const b = bucket(kind2); b.plays++; b.rolls += rolls; b.pSum += pSum; b.assistRolls += assistRolls;
    b.fumbles += (st.fumbles?.length ?? 0); b.lost += st.fumbleLost ? 1 : 0; b.missed += st.missedTackles ?? 0; b.broken += st.brokenTackles ?? 0;
    const ev = r.events ?? sim.events ?? []; for (const e of ev) if (e.type === 'tackle_wrap') { if (e.note === 'assist' || e.detail === 'assist') b.assists++; else b.first++; }
    return r; } } });
}
console.log(`${games} games from seed ${first}; per play (rates per roll)`);
for (const [k, b] of Object.entries(acc)) console.log(`  ${k.padEnd(10)} plays ${String(b.plays).padStart(4)} | fumble rolls ${(b.rolls / b.plays).toFixed(3)} a play (with the runner already wrapped ${(100 * b.assistRolls / Math.max(1, b.rolls)).toFixed(0)}%), mean odds a roll ${(100 * b.pSum / Math.max(1, b.rolls)).toFixed(2)}%, expected fumbles ${(b.pSum / b.plays).toFixed(4)} a play, observed ${(b.fumbles / b.plays).toFixed(4)} (lost ${b.lost}) | tackle wraps first ${(b.first / b.plays).toFixed(2)}, assists ${(b.assists / b.plays).toFixed(2)} | missed ${(b.missed / b.plays).toFixed(3)}, broken ${(b.broken / b.plays).toFixed(3)} a play`);
