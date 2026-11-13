// The rusher-blocker first hit on pass plays (Integration, 2026-11-10: CONTACT_LAYER's pass-protection read). Coverage's
// pressure grid (out/pro-grid.ts: 960 paired dropbacks, 15 pressure looks x 4 formations x 4 concepts x flip x team),
// one arm per process. JSON lines: one per play (kind 'play') and one per OL-DL pass engagement (kind 'rep').
//   play: sack; time a defender is first within 2 yd of the QB before the throw (pressure), and that defender (slot,
//         the blocker still on him then or null, whether he was ever blocked); QB hit = torso contact
//         between a defender and the QB before or within 0.3 s after the throw; throw time; yards.
//   rep:  the rusher's move when the hands first carry load (e.contactReported); closing speed along the line of
//         centres at the start of the tick that makes contact and 0.1 s after (yd/s); rusher's depth gained toward the QB from
//         contact to +0.5 s and to +1.0 s (yd, + = rusher gaining); time from engagement start to the first win
//         (e.win >= 1) or null; the pair's line of centres' turn from contact to +1.0 s (deg).
// usage: node --import tsx scripts/diag/effective-mass/protect-hit.mts > out.jsonl
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURES } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']), DL = /^(DE|DT|NT)/;
const forms = ['gun_doubles_11', 'gun_trips_11', 'ace_11', 'gun_empty_11'], passes = ['curl_flat', 'smash', 'dagger', 'four_verts'];
const press = [null, ...PRESSURES.map((p: any) => p.id)];
const teams = [1, 2, 3].map(i => ({ o: generateTeam(new Rng(100 + i), 'O', 'O', { strength: .55 }), d: generateTeam(new Rng(200 + i), 'D', 'D', { strength: .55 }) }));
let n = 0;
for (const pid of press) for (const fid of forms) for (const cid of passes) for (const flip of [false, true]) for (const t of [0, 1]) {
  const formation = FORMATION_BY_ID[fid]; const T = teams[(n + t) % 3]; const P = pid ? PRESSURES.find((p: any) => p.id === pid)! : null;
  let sim: any; try { sim = new PlaySim({ offense: pickOffense(T.o, formation.personnel), defense: pickDefense(T.d, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: PASS_BY_ID[cid], label: cid },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: P, label: pid ?? 'none' } as any,
    los: 35 + (n % 3) * 10, ballY: [23.6, 26.65, 29.7][n % 3], firstDownX: 55, seed: 5000 + n, audibles: false } as any); } catch { n++; continue; }
  const id = n++; let close = -1, qbHit = false, presser: any = null; const everBlocked = new Set<any>(); const reps = new Map<any, any>(); const tick = sim.tick.bind(sim);
  const lineAngle = (a: any, b: any) => Math.atan2(b.pos.y - a.pos.y, b.pos.x - a.pos.x);
  sim.tick = () => {
    const pre = new Map<any, any>(); for (const a of sim.agents) pre.set(a, { x: a.pos.x, y: a.pos.y, vx: a.vel.x, vy: a.vel.y });
    const closing = (b: any, d: any) => { const B = pre.get(b), D = pre.get(d); if (!B || !D) return null;
      const rx = D.x - B.x, ry = D.y - B.y, rd = Math.hypot(rx, ry) || 1; return ((B.vx - D.vx) * rx + (B.vy - D.vy) * ry) / rd; };
    tick(); const qb = sim.qb;
    if (close < 0 && sim.throwAt < 0) { const d = sim.defense.find((d: any) => Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) <= 2);
      if (d) { close = sim.t; const e = (sim.engagements ?? []).find((q: any) => q.defender === d);
        presser = { slot: d.slot, engaged: e ? e.blocker.slot : null, wasBlocked: everBlocked.has(d) }; } }
    for (const e of sim.engagements ?? []) everBlocked.add(e.defender);
    const qi = sim.world?.indexOf?.(qb.body);
    if (!qbHit && qi !== undefined && (sim.throwAt < 0 || sim.t <= sim.throwAt + 0.3)) for (const c of sim.lastStep?.contacts ?? []) {
      const o = c.i === qi ? c.j : c.j === qi ? c.i : -1; if (o >= 0 && sim.defense.some((d: any) => sim.world.indexOf(d.body) === o)) qbHit = true; }
    for (const e of sim.engagements ?? []) {
      if (e.type !== 'pass' || !OL.has(e.blocker.slot) || !DL.test(e.defender.slot)) continue;
      let r = reps.get(e); if (!r) { r = { kind: 'rep', play: id, pid: pid ?? 'none', start: e.start, win: null, t0: null }; reps.set(e, r); }
      if (r.win === null && e.win >= 1) r.win = +(sim.t - e.start).toFixed(2);
      const toQb = (d: any) => -Math.hypot(qb.pos.x - d.pos.x, qb.pos.y - d.pos.y);
      if (r.t0 === null && e.contactReported) { r.t0 = sim.t; r.move = e.move; { const c = closing(e.blocker, e.defender); r.close0 = c === null ? null : +c.toFixed(2); } r.d0 = toQb(e.defender); r.a0 = lineAngle(e.blocker, e.defender); }
      if (r.t0 !== null) { const s = sim.t - r.t0, b = e.blocker, d = e.defender;
        if (Math.abs(s - 0.1) < 0.026) { const rx = d.pos.x - b.pos.x, ry = d.pos.y - b.pos.y, rd = Math.hypot(rx, ry) || 1; r.close1 = +(((b.vel.x - d.vel.x) * rx + (b.vel.y - d.vel.y) * ry) / rd).toFixed(2); }
        if (Math.abs(s - 0.5) < 0.026) r.gain5 = +(toQb(d) - r.d0).toFixed(2);
        if (Math.abs(s - 1.0) < 0.026) { r.gain10 = +(toQb(d) - r.d0).toFixed(2); const a = lineAngle(b, d); r.turn10 = +(Math.abs(Math.atan2(Math.sin(a - r.a0), Math.cos(a - r.a0))) * 180 / Math.PI).toFixed(0); } }
    }
  };
  const res: any = sim.run(); const s: any = sim.stats;
  console.log(JSON.stringify({ kind: 'play', play: id, pid: pid ?? 'none', sack: !!s.sacked, close, presser, qbHit, ttt: sim.throwAt, y: res.yards }));
  for (const r of reps.values()) if (r.t0 !== null) { delete r.d0; delete r.a0; console.log(JSON.stringify(r)); }
}
