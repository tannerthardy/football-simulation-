// PUNCH on run reps (Integration's run control, 2026-11-12: PUNCH costs the run game -0.30 yd a carry, outside-zone
// DL sheds at the hit 4 -> 10%). Every engaged run rep's own hands joint, every tick: the blocker's extension as a
// share of his arm, whether he is in PUNCH's overextended state (push cut to a third), the joint's normal force, and
// at each run-rep shed (the 'shed' event, 'run: ...') the blocker's extension and state in the tick before.
// usage: PUNCH=1 [flags] node --import tsx scripts/diag/effective-mass/punch-run.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const q = (v: number[], f = 0.5) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
const ticks: { ext: number; push: number; N: number }[] = []; const sheds: any[] = []; let runs = 0;
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || sim.isPass) return undefined;
    runs++;
    const last = new Map<any, any>();
    const ev = sim.event.bind(sim);
    sim.event = (type: string, a: any, b: any, note?: string) => {
      if (type === 'shed' && note?.startsWith('run') && b && last.has(b)) sheds.push({ ...last.get(b), why: note });
      return ev(type, a, b, note);
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      for (const e of sim.engagements) {
        if (e.type !== 'run' || !e.hands || e.control < 0) continue;
        const b = e.blocker, d = e.defender, bodies = b.profile.radius + d.profile.radius, arm = b.player.measurables.armIn / 36;
        const r = { ext: (e.hands.extension - bodies) / arm, push: e.hands.push, N: e.hands.normalForce ?? 0, gap: (Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) - bodies) / arm };
        ticks.push(r); last.set(b, r);
      }
    };
    return sim.run(); } } });
}
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
console.log(`runs ${runs} | run-rep blocker hand ticks ${ticks.length}: extension / arm p25/50/75 ${q(ticks.map((t) => t.ext), .25).toFixed(2)}/${q(ticks.map((t) => t.ext)).toFixed(2)}/${q(ticks.map((t) => t.ext), .75).toFixed(2)} | at lockout (>= 0.88) ${pc(ticks.filter((t) => t.ext >= 0.88).length, ticks.length)} | N p50 ${q(ticks.map((t) => t.N)).toFixed(0)}`);
console.log(`run-rep sheds ${sheds.length} (${(sheds.length / Math.max(1, runs)).toFixed(2)} a run): blocker extension / arm the tick before p25/50/75 ${q(sheds.map((t) => t.ext), .25).toFixed(2)}/${q(sheds.map((t) => t.ext)).toFixed(2)}/${q(sheds.map((t) => t.ext), .75).toFixed(2)} | at lockout ${pc(sheds.filter((t) => t.ext >= 0.88).length, sheds.length)} | gap / arm p50 ${q(sheds.map((t) => t.gap)).toFixed(2)} | N p50 ${q(sheds.map((t) => t.N)).toFixed(0)}`);
const w: Record<string, number> = {}; for (const s of sheds) w[s.why] = (w[s.why] ?? 0) + 1;
console.log('  why: ' + Object.entries(w).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' | '));
