// The pass rusher's request while engaged, by his state (Integration, 2026-11-12: rushers cross their tackle's face
// at about 4 yd/s, NFL 3.8, unslowed; is that his between-moves default?). Every tick of every pass rep while the QB
// holds the ball, the defender's state:
//   'move live' (landed and in its window), 'move failed' (its window, the roll lost: stalled),
//   'power (sticky)' (between moves, last move bull/long-arm), 'between moves' (no move window, finesse or none),
// and whether 'turned' (phi x side > 0.5: aiming at the QB). Per state: share of rep time, his requested speed as a
// share of his vmax, push, the share of his request toward the QB, his achieved speed and speed toward the QB, and
// the blocker's achieved speed. Edge (|y - ball| > 3) and interior separately.
// usage: [flags] node --import tsx scripts/diag/effective-mass/rusher-state.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const q = (v: number[], f = 0.5) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
const acc: Record<string, any[]> = {};
const { rushIntentOf } = await import(`${W}/src/sim/engagement.ts`);
const intentLog = { time: 0, switches: 0, reversals: 0, share: {} as Record<string, number> };
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      const qb = sim.qb; if (!qb || sim.carrier !== qb || sim.throwAt >= 0) return;
      for (const e of sim.engagements) {
        if (e.type !== 'pass') continue;
        const d = e.defender, b = e.blocker, it = sim.intents[d.idx]; if (!it) continue;
        const inWin = sim.t < e.moveUntil;
        const state = inWin ? (e.moveOk ? 'move live' : 'move failed') : (e.move === 'bull' || e.move === 'longarm') ? 'power (sticky)' : 'between moves';
        const turned = e.phi * e.side > 0.5;
        const ux = qb.pos.x - d.pos.x, uy = qb.pos.y - d.pos.y, L = Math.hypot(ux, uy) || 1;
        const rs = Math.hypot(it.vel.x, it.vel.y);
        const ri = rushIntentOf(e);
        if (ri) { intentLog.time += sim.dt; intentLog.share[ri.intent] = (intentLog.share[ri.intent] ?? 0) + sim.dt;
          const last = (e as any).__ri; if (last && ri.switches > last.switches) intentLog.switches += ri.switches - last.switches;
          if (last && ri.reversals > last.reversals) intentLog.reversals += ri.reversals - last.reversals; (e as any).__ri = { ...ri }; }
        const k = `${Math.abs(d.pos.y - sim.ballY) > 3 ? 'edge' : 'interior'} / ${state}${ri && state === 'between moves' && !turned ? ` (${ri.intent})` : ''}${turned ? ' / turned' : ''}`;
        (acc[k] ??= []).push({ req: rs / d.profile.vmax, push: it.push ?? NaN, toQB: rs > 0.1 ? (it.vel.x * ux + it.vel.y * uy) / (rs * L) : NaN,
          ach: Math.hypot(d.vel.x, d.vel.y), achQB: (d.vel.x * ux + d.vel.y * uy) / L, bAch: Math.hypot(b.vel.x, b.vel.y) });
      }
    };
    return sim.run(); } } });
}
const tot: Record<string, number> = {}; for (const [k, v] of Object.entries(acc)) { const g = k.split(' / ')[0]; tot[g] = (tot[g] ?? 0) + v.length; }
if (intentLog.time > 0) console.log(`RUSH_INTENT: engaged rusher time with an intent ${intentLog.time.toFixed(0)} s | intent switches ${(intentLog.switches / intentLog.time).toFixed(2)}/s, reversed (A->B->A within 0.6 s) ${intentLog.switches ? (100 * intentLog.reversals / intentLog.switches).toFixed(0) : '-'}% | time in edge/power/stall ${['edge', 'power', 'stall'].map((k) => (100 * (intentLog.share[k] ?? 0) / intentLog.time).toFixed(0) + '%').join('/')}`);
for (const [k, R] of Object.entries(acc).sort()) {
  const g = k.split(' / ')[0];
  console.log(`${k.padEnd(42)} ${(100 * R.length / tot[g]).toFixed(0).padStart(3)}% of ${g} rep time | requests ${q(R.map((r) => r.req)).toFixed(2)} vmax, push ${q(R.map((r) => r.push)).toFixed(2)}, toward the QB ${q(R.map((r) => r.toQB)).toFixed(2)} of it | achieved ${q(R.map((r) => r.ach)).toFixed(2)} yd/s (toward the QB ${q(R.map((r) => r.achQB)).toFixed(2)}) | blocker ${q(R.map((r) => r.bAch)).toFixed(2)}`);
}
