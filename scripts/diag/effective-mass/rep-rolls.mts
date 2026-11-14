// How a pass rep is decided (Flex, 2026-11-14; Integration: rank PRO-INFO #9/#10 by share of rep endings). Per pass rep
// (OL vs DL/LB, while the QB holds the ball): every move resolution (resolveMove sets moveUntil = t + 0.3 with moveOk,
// the rng.chance roll; RUSH_HANDS' club and long-arm are forces, not rolls), and how the rep ended: the rusher shed
// ('pass: past him' / 'turned the corner'), or still engaged at the throw / sack / play end, or released otherwise.
// For each shed: the move resolved last before it, and whether a won roll came within 0.6 s before (the roll decided
// the win's opening) or not (bodies alone). Then per move: rolls, won share, sheds it opened, and what a shed leads
// to (pressure: the rusher within 2 yd of the QB before the ball is out).
// usage: [flags] node --import tsx scripts/diag/effective-mass/rep-rolls.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const rolls = new Map<string, { n: number; ok: number }>();
const ends: any[] = []; const gains: any[] = []; let reps = 0, drops = 0;
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  drops++;
  const live = new Map<any, any>(); const tick = sim.tick.bind(sim); const after: any[] = [];
  const ev0 = sim.event.bind(sim);
  const shedNow = new Set<any>();
  sim.event = (type: string, a: any, b: any, note?: string) => { if (type === 'shed' && note?.startsWith('pass')) shedNow.add(a); return ev0(type, a, b, note); };
  const closeTo = (d: any) => Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2;
  sim.tick = () => {
    const held = sim.carrier === sim.qb && sim.throwAt < 0;
    shedNow.clear();
    tick();
    const seen = new Set<any>();
    for (const e of sim.engagements) {
      if (e.type !== 'pass') continue;
      seen.add(e);
      let r = live.get(e);
      if (!r) { r = { e, d: e.defender, start: sim.t, lastUntil: e.moveUntil, res: [] as any[] }; live.set(e, r); reps++; }
      // A control sample: an engaged tick with no move in flight, 0.5 s on.
      if (!(e.moveUntil > sim.t) && Math.random() < 0.05) after.push({ t: sim.t, move: 'none', ok: false, ctrl: true, dq: Math.hypot(e.defender.pos.x - sim.qb.pos.x, e.defender.pos.y - sim.qb.pos.y), d: e.defender, edge: Math.abs(e.defender.pos.y - sim.ballY) > 3 });
      if (e.moveUntil !== r.lastUntil && e.moveUntil > sim.t) {
        r.lastUntil = e.moveUntil;
        const dq = Math.hypot(r.d.pos.x - sim.qb.pos.x, r.d.pos.y - sim.qb.pos.y);
        const x = { t: sim.t, move: e.move, ok: !!e.moveOk, dq, d: r.d, edge: Math.abs(r.d.pos.y - sim.ballY) > 3 };
        r.res.push(x); after.push(x);
        const k = rolls.get(e.move) ?? { n: 0, ok: 0 }; k.n++; if (e.moveOk) k.ok++; rolls.set(e.move, k);
      }
    }
    for (const [e, r] of live) {
      if (seen.has(e)) continue;
      live.delete(e);
      const shed = shedNow.has(r.d);
      const last = r.res[r.res.length - 1];
      const won = [...r.res].reverse().find((x: any) => x.ok && sim.t - x.t <= 0.6);
      ends.push({ shed, held, last: last?.move ?? 'none', rolled: !!won, wonMove: won?.move ?? null, d: r.d, t: sim.t, pressure: false });
    }
    for (const x of after) if (x.gain === undefined && sim.t - x.t >= 0.5 - 1e-9) { x.gain = x.dq - Math.hypot(x.d.pos.x - sim.qb.pos.x, x.d.pos.y - sim.qb.pos.y); gains.push(x); }
    for (const x of ends) if (x.shed && !x.pressure && sim.carrier === sim.qb && sim.throwAt < 0 && closeTo(x.d) && sim.t - x.t < 2) x.pressure = true;
  };
  const out = sim.run();
  for (const [, r] of live) ends.push({ shed: false, held: false, last: r.res[r.res.length - 1]?.move ?? 'none', rolled: false, wonMove: null, d: r.d, t: sim.t, pressure: false, open: true });
  return out;
} } });
const sheds = ends.filter((x) => x.shed);
console.log(`dropbacks ${drops} | pass reps ${reps} | rep endings: shed by the rusher ${sheds.length} (${(100 * sheds.length / Math.max(1, ends.length)).toFixed(1)}%), other ${ends.length - sheds.length}`);
console.log(`sheds with a won roll within 0.6 s before: ${sheds.filter((x) => x.rolled).length} (${(100 * sheds.filter((x) => x.rolled).length / Math.max(1, sheds.length)).toFixed(0)}%); sheds -> pressure (within 2 yd before the ball is out) ${sheds.filter((x) => x.pressure).length}`);
const moves = [...new Set([...rolls.keys(), ...sheds.map((x) => x.wonMove ?? 'no roll')])];
const rows = moves.map((m) => {
  const r = rolls.get(m) ?? { n: 0, ok: 0 };
  const opened = sheds.filter((x) => (x.wonMove ?? 'no roll') === m);
  return { m, n: r.n, ok: r.ok, opened: opened.length, press: opened.filter((x) => x.pressure).length };
}).sort((a, b) => b.opened - a.opened);
for (const r of rows) console.log(`  ${r.m.padEnd(8)} rolls ${String(r.n).padStart(5)} won ${(100 * r.ok / Math.max(1, r.n)).toFixed(0).padStart(3)}% | sheds it opened ${String(r.opened).padStart(4)} (${(100 * r.opened / Math.max(1, sheds.length)).toFixed(0).padStart(2)}% of sheds) -> pressure ${r.press}`);
const med = (v: number[]) => { const q = [...v].sort((a, b) => a - b); return q.length ? q[Math.floor(q.length / 2)].toFixed(2) : 'nan'; };
for (const edge of [true, false]) {
  const G = gains.filter((x) => x.edge === edge);
  console.log(`${edge ? 'edge' : 'interior'}: the rusher's gain on the QB over 0.5 s (yd, p50) | after a lost roll ${med(G.filter((x) => !x.ok && !x.ctrl).map((x) => x.gain))} (n ${G.filter((x) => !x.ok && !x.ctrl).length}) | after a won roll ${med(G.filter((x) => x.ok).map((x) => x.gain))} (n ${G.filter((x) => x.ok).length}) | engaged, no move in flight ${med(G.filter((x) => x.ctrl).map((x) => x.gain))} (n ${G.filter((x) => x.ctrl).length})`);
}
