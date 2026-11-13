// What ends our pass reps (Flex, 2026-11-13, after come-off.py: our reps end ~1.1 s earlier than the NFL's and
// 1.4-2x as often). Per pass rep with a primary blocker (OL), when it leaves sim.engagements before the throw: how long
// it lasted, how it ended (the shed note the rep's beat recorded that tick, or 'dissolved' without one), the rusher's
// move and whether a landed move was in its window, the hands' state (both on, one off, off), whether the man was past
// along his path, the centre distance; over its last 0.3 s, how fast each man opened the gap along the line between
// them (+ = away from the other), what the blocker asked for along it, the rusher's speed toward the QB, the hands' press. Interior (G/C) and tackles.
// usage: [flags] node --import tsx scripts/diag/effective-mass/rep-end.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { pastAlongPath } = await import(`${W}/src/sim/engagement.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: any[] = []; let drops = 0;
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    drops++;
    const start = new Map<any, number>(), lastSeen = new Map<any, any>();
    const caller = new Map<any, string>();
    const dis = sim.disengage.bind(sim);
    sim.disengage = (e: any) => {
      const line = (new Error().stack ?? '').split('\n')[2] ?? '';
      const m = line.match(/(\w+\.ts):(\d+)/);
      const down = e.blocker.isDown(sim.t) ? (e.defender.isDown(sim.t) ? 'both down' : 'blocker down') : e.defender.isDown(sim.t) ? 'rusher down' : '';
      caller.set(e, (m ? `${m[1]}:${m[2]}` : '?') + (down ? ` (${down}, ${e.blocker.body.support?.state ?? '?'})` : ''));
      return dis(e);
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const before = new Set<any>(sim.engagements.filter((e: any) => e.type === 'pass'));
      for (const e of before) {
        if (!start.has(e)) start.set(e, sim.t);
        const h = e.hands, b = e.blocker, d = e.defender;
        const dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y, dl = Math.hypot(dx, dy) || 1e-6, nx = dx / dl, ny = dy / dl;
        const iv = sim.intents?.[b.idx]?.vel, qb = sim.qb.pos, ql = Math.hypot(qb.x - d.pos.x, qb.y - d.pos.y) || 1e-6;
        const hist = (lastSeen.get(e)?.hist ?? []).concat([{ bOpen: -(b.vel.x * nx + b.vel.y * ny), dOpen: d.vel.x * nx + d.vel.y * ny,
          bAsk: iv ? -(iv.x * nx + iv.y * ny) : NaN, dQB: (d.vel.x * (qb.x - d.pos.x) + d.vel.y * (qb.y - d.pos.y)) / ql,
          N: h?.normalForce ?? 0 }]).slice(-3);
        lastSeen.set(e, { hist, move: e.move, inMove: sim.t < e.moveUntil && e.moveOk, hands: !h ? 'none' : h.off ? 'off' : (h.handsOn ?? 2) === 1 ? 'one off' : 'both on',
          past: pastAlongPath(e.blocker, e.defender, Math.abs(e.phi)), riding: !!e.riding, cd: Math.hypot(e.blocker.pos.x - e.defender.pos.x, e.blocker.pos.y - e.defender.pos.y) });
      }
      const nEv = sim.events.length, held = sim.carrier === sim.qb;
      tick();
      if (!held) return;
      for (const e of before) {
        if (sim.engagements.includes(e)) continue;
        if (!['LT', 'LG', 'C', 'RG', 'RT'].includes(e.blocker.slot)) continue;
        const ev = sim.events.slice(nEv).find((x: any) => x.type === 'shed' && sim.agents[x.a] === e.defender);
        const ls = lastSeen.get(e);
        rows.push({ interior: ['LG', 'C', 'RG'].includes(e.blocker.slot), why: ev ? String(ev.note).replace(/^pass: /, '') : `ended at ${caller.get(e) ?? 'no disengage'}`, t: sim.t, dur: sim.t - start.get(e)!, ...ls });
      }
    };
    return sim.run();
  } } });
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
const mean = (h: any[], k: string) => h.reduce((a, x) => a + x[k], 0) / Math.max(1, h.length);
const share = (R: any[], f: (r: any) => boolean) => `${(100 * R.filter(f).length / Math.max(1, R.length)).toFixed(0)}%`;
console.log(`dropbacks ${drops}`);
for (const [lab, inner] of [['interior', true], ['tackles', false]] as const) {
  const R = rows.filter((r) => r.interior === inner);
  console.log(`${lab}: reps ended before the throw ${(100 * R.length / Math.max(1, drops)).toFixed(1)} /100 dropbacks | time p25/50/75 ${q(R.map((r) => r.t), .25)}/${q(R.map((r) => r.t))}/${q(R.map((r) => r.t), .75)} | lasted p50 ${q(R.map((r) => r.dur))}`);
  const whys = [...new Set(R.map((r) => r.why))];
  for (const w of whys) {
    const C = R.filter((r) => r.why === w);
    const moves: Record<string, number> = {}; for (const r of C) moves[r.move] = (moves[r.move] ?? 0) + 1;
    console.log(`   ${w.padEnd(20)} ${(100 * C.length / Math.max(1, drops)).toFixed(1).padStart(5)} /100 | at ${q(C.map((r) => r.t))} s, lasted ${q(C.map((r) => r.dur))} | in a landed move ${share(C, (r) => r.inMove)}`
      + ` | hands: both on ${share(C, (r) => r.hands === 'both on')}, one off ${share(C, (r) => r.hands === 'one off')}, off ${share(C, (r) => r.hands === 'off')} | past ${share(C, (r) => r.past)} | riding ${share(C, (r) => r.riding)} | centre ${q(C.map((r) => r.cd))}`
      + ` | last 0.3 s: opening by blocker ${q(C.map((r) => mean(r.hist, 'bOpen')))} (asks ${q(C.map((r) => mean(r.hist, 'bAsk')))}), by rusher ${q(C.map((r) => mean(r.hist, 'dOpen')))}, rusher toward QB ${q(C.map((r) => mean(r.hist, 'dQB')))}, press N ${q(C.map((r) => mean(r.hist, 'N')))}`
      + ` | moves ${Object.entries(moves).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${(100 * v / C.length).toFixed(0)}%`).join(', ')}`);
  }
}
