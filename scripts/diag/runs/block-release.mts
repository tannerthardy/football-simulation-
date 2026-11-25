// Block release on designed runs (Run Game, 2026-11-24), measurement only. For every defender who comes within REACH yd
// of the carrier, free of a block at his closest approach, having been engaged earlier on the play: how long he was
// engaged, why the engagement ended (engagement.ts runContactObservers 'end' reasons), how long before his closest
// approach it ended, the load in the blocker's hands over his last 0.5 s engaged (normal + tangent force), and what he
// was asking for meanwhile: his commanded velocity toward the carrier against what he achieved (was he trying to leave
// and held, or still playing the block). Usage: node --import tsx block-release.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { runContactObservers } = await import(`${W}/src/sim/run-contact-observer.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const REACH = 2.5;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const rows: any[] = [];
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) {
    s = !compilingPlan() && this.offCall?.kind === 'run' && this.defCall ? { tc: null as number | null, eng: new Map<any, any>(), done: [] as any[], closest: new Map<any, any>(), held: false } : null;
    st.set(this, s);
    if (s) {
      const prev = runContactObservers.get(this);
      runContactObservers.set(this, (e: any, ph: string, data: any) => {
        prev?.(e, ph, data);
        if (ph !== 'end') return;
        const x = s.eng.get(e);
        if (x) { x.end = this.t; x.reason = data?.reason ?? '?'; x.past = data?.past ?? null; s.done.push(x); s.eng.delete(e); }
      });
    }
  }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  if (s.tc === null && bc && bc.team === sim.offense[0].team && bc !== sim.qb) s.tc = sim.t;
  // An engagement gone without an observed 'end' (a grab that gives up the block, a pass rep converted, ...).
  for (const [e, x] of s.eng) if (!sim.engagements.includes(e)) {
    x.end = sim.t; x.reason = sim.bond?.tacklers.includes(x.def) ? 'he grabbed the carrier' : 'ended (no observed reason)'; x.past = null; s.done.push(x); s.eng.delete(e);
  }
  for (const e of sim.engagements) {
    if (e.type !== 'run') continue;
    let x = s.eng.get(e);
    if (!x) { x = { def: e.defender, blocker: e.blocker.slot, start: e.start, hist: [] as any[] }; s.eng.set(e, x); }
    const h = e.hands, f = h ? Math.hypot(h.normalForce ?? 0, h.tangentForce ?? 0) : 0;
    const d = e.defender, c = bc && bc.team === sim.offense[0].team ? bc : null;
    let ask = null, got = null;
    if (c && c !== sim.qb) {
      const rx = c.pos.x - d.pos.x, ry = c.pos.y - d.pos.y, rd = Math.hypot(rx, ry) || 1;
      const cmd = sim.cmds?.[d.idx]?.vel;
      ask = cmd ? (cmd.x * rx + cmd.y * ry) / rd : null; got = (d.vel.x * rx + d.vel.y * ry) / rd;
    }
    x.hist.push([sim.t, r3(f), r3(e.win), r3(e.control), ask === null ? null : r3(ask), got === null ? null : r3(got)]);
    if (x.hist.length > 12) x.hist.shift();
  }
  if (s.tc !== null && bc && bc.team === sim.offense[0].team && bc !== sim.qb && !s.held) {
    if (sim.bond) s.held = true;
    for (const d of sim.defense) {
      const dist = Math.hypot(bc.pos.x - d.pos.x, bc.pos.y - d.pos.y);
      const cur = s.closest.get(d);
      if (!cur || dist < cur.dist) s.closest.set(d, { dist, t: sim.t, free: !d.engagement });
    }
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s && s.tc !== null) {
    for (const [, x] of s.eng) { x.end = null; x.reason = 'still engaged at the end'; s.done.push(x); }
    for (const [d, cl] of s.closest) {
      if (cl.dist > REACH || !cl.free) continue;
      const before = s.done.filter((x: any) => x.def === d && x.end !== null && x.end <= cl.t + 1e-9);
      if (!before.length) continue;
      const x = before[before.length - 1];
      const last = x.hist.filter((h: any) => h[0] >= x.end - 0.5 - 1e-9);
      const mean = (k: number) => { const v = last.map((h: any) => h[k]).filter((u: any) => u !== null); return v.length ? r3(v.reduce((a: number, b: number) => a + b, 0) / v.length) : null; };
      rows.push({ pos: d.player.position, slot: d.slot, blocker: x.blocker, engaged: r3(x.end - x.start), reason: x.reason, past: x.past === null ? null : r3(x.past),
        releaseToClosest: r3(cl.t - x.end), closest: r3(cl.dist), handsForce: mean(1), win: mean(2), control: mean(3), askToward: mean(4), gotToward: mean(5),
        engagedSinceSnap: r3(x.start), carrierAt: s.tc === null ? null : r3(x.end - s.tc) });
    }
  }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} releases`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, rows }));
console.log('releases', rows.length);
