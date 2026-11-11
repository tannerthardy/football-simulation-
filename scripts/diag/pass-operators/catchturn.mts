// Catches (game hooks): the catcher's velocity heading at the catch and its change at +0.1/0.2/0.3/0.5 s, speed, and the
// requested heading's departure from his velocity on the catch tick and at +0.1 s; the first carrier decision's heading
// vs his travel; nearest defender at the catch (contested < 3 yd).
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const R: Record<string, number[]> = {}; const push = (k: string, v: number) => (R[k] ??= []).push(v);
const ang = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 8);
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    let c: any = null, t0 = 0, h0 = 0; const marks = [0.1, 0.2, 0.3, 0.5]; let i = 0; let cont = false;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { const before = sim.catchAt; tick();
      if (!c && sim.catchAt >= 0 && sim.carrier && sim.carrier.team === 'O' && sim.carrier !== sim.qb) { c = sim.carrier; t0 = sim.t; h0 = Math.atan2(c.vel.y, c.vel.x);
        cont = sim.defense.some((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 3);
        push('speed0', Math.hypot(c.vel.x, c.vel.y)); const cm = sim.cmds[c.idx]?.vel; if (cm) push(`req dev catch tick${cont ? ' C' : ''}`, ang(Math.atan2(cm.y, cm.x), h0));
        push('up0', c.vel.x * sim.attackDir('O')); return; }
      if (c && i < marks.length && sim.t - t0 >= marks[i] - 1e-9) { if (sim.carrier !== c) { i = 99; return; }
        const h = Math.atan2(c.vel.y, c.vel.x); push(`turn ${marks[i]}${cont ? ' C' : ''}`, ang(h, h0)); push(`turn ${marks[i]} all`, ang(h, h0));
        const cm = sim.cmds[c.idx]?.vel; if (cm && marks[i] === 0.1) push(`req dev 0.1${cont ? ' C' : ''}`, ang(Math.atan2(cm.y, cm.x), h));
        if (marks[i] === 0.5) { push('speed5', Math.hypot(c.vel.x, c.vel.y)); push('up5', c.vel.x * sim.attackDir('O')); }
        i++; } };
    return sim.run(); } } });
}
const q = (v: number[] = []) => { if (!v.length) return '-'; const s = [...v].sort((a, b) => a - b); return [0.5, 0.75].map((x) => s[Math.floor(x * (s.length - 1))].toFixed(1)).join('/'); };
console.log(`catches ${R.speed0?.length}; speed at catch ${q(R.speed0)} -> +0.5 s ${q(R.speed5)}; upfield at catch ${q(R.up0)} -> +0.5 s ${q(R.up5)}`);
for (const m of [0.1, 0.2, 0.3, 0.5]) console.log(`heading change by +${m} s p50/p75: all ${q(R[`turn ${m} all`])} | contested ${q(R[`turn ${m} C`])}`);
console.log(`request vs travel on the catch tick: uncontested ${q(R['req dev catch tick'])} contested ${q(R['req dev catch tick C'])} | at +0.1 s: ${q(R['req dev 0.1'])} / ${q(R['req dev 0.1 C'])}`);
