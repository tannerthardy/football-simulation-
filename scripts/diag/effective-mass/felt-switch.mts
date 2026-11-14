// ENGAGE_FELT (Integration, 2026-11-14): does feltMan's picture jump between its touch delay (0.06 s) and its sight
// delay (0.12-0.24 s) as the hands' load crosses zero? Per engaged (observer, man) pair, per game: the share of calls by
// touch, the switches per engaged second, and the run-length of touch / sight stretches (ticks); and the picture's jump at
// a switch (the felt position's change that tick minus the man's own motion that tick, yd).
// usage: ENGAGE_FELT=1 node --import tsx scripts/diag/effective-mass/felt-switch.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { feltProbe } = await import(`${W}/src/sim/engagement.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let calls = 0, touch = 0, switches = 0; const runs: Record<string, number[]> = { touch: [], sight: [] };
const st = new Map<string, { on: boolean; n: number; t: number }>();
const byRole: Record<string, { calls: number; sw: number }> = {};
const lastD = new Map<string, { d: number; t: number }>(); const steps: number[] = [];
feltProbe.on = (self: any, man: any, on: boolean, t: number, delay?: number) => {
  calls++; if (on) touch++;
  { const k0 = `${self.idx}>${man.idx}`, L = lastD.get(k0); if (L && t > L.t && t - L.t < 0.051 && delay !== undefined) steps.push(delay - L.d); if (delay !== undefined) lastD.set(k0, { d: delay, t }); }
  const k = `${self.idx}>${man.idx}`, role = `${self.team === 'O' ? 'blocker' : 'defender'}`, r = (byRole[role] ??= { calls: 0, sw: 0 }); r.calls++;
  const p = st.get(k);
  if (p && t > p.t && t - p.t < 0.051) {
    if (p.on !== on) { switches++; r.sw++; runs[p.on ? 'touch' : 'sight'].push(p.n); p.on = on; p.n = 1; } else p.n++;
    p.t = t;
  } else { if (p) runs[p.on ? 'touch' : 'sight'].push(p.n); st.set(k, { on, n: 1, t }); }
};
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g });
const q = (v: number[], f: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const dt = 0.05;
console.log(`feltMan calls ${calls} (${(calls * dt).toFixed(0)} engaged observer-s) | by touch ${(100 * touch / calls).toFixed(1)}% | switches ${switches} = ${(switches / (calls * dt)).toFixed(2)} per engaged second`);
for (const [r, v] of Object.entries(byRole)) console.log(`  ${r.padEnd(9)} ${(v.sw / (v.calls * dt)).toFixed(2)} switches per engaged second (${v.calls} calls)`);
console.log(`  the delay used, tick to tick: the picture stepping back in time (older by more than the 0.05 s tick) ${(100 * steps.filter((x) => x > 0.05 + 1e-9).length / Math.max(1, steps.length)).toFixed(2)}% of ticks, largest ${Math.max(0, ...steps).toFixed(2)} s | fresher by > 0.03 s (touch regained) ${(100 * steps.filter((x) => x < -0.03 - 1e-9).length / Math.max(1, steps.length)).toFixed(2)}%`);
for (const k of ['touch', 'sight']) console.log(`  ${k} stretches (ticks): n ${runs[k].length} p25/50/75 ${q(runs[k], .25)}/${q(runs[k], .5)}/${q(runs[k], .75)} | single-tick ${(100 * runs[k].filter((x) => x === 1).length / Math.max(1, runs[k].length)).toFixed(0)}%`);
