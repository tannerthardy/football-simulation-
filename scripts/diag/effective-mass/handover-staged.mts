// PASS_OFF's hand-over, staged (Integration, 2026-11-16: the keeper's control from his own fit, PASS_HANDOVER). On the
// QB lane's staged plays (as edge-ride-staged.mts: 864, mirrored), every hand-over (the rep's blocker changes to a
// helper): the control before and after, the keeper's lateness (his distance to the man minus his reach: bodies plus
// 0.3 of his arm, firstHands' landing reach; + = late), whether he is on his feet, the rusher's move; then what the man
// does next: released from the keeper within 0.5 s (past 1.2 yd), and within 2 yd of the QB before the ball is out.
// usage: [PASS_HANDOVER=1] node --import tsx scripts/diag/effective-mass/handover-staged.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { traits } = await import(`${W}/src/sim/engagement.ts`);
const H: any[] = [];
for (const concept of ['four_verts', 'smash', 'dagger']) for (const coverage of ['cover2', 'cover3', 'cover1']) for (let roster = 1; roster <= 12; roster++) for (const seed of [1, 2, 3, 4]) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip })); } catch { continue; }
  const prev = new Map<any, { blocker: any; control: number }>(); const open: any[] = [];
  while (sim.phase === 'live' && sim.t < 5) {
    const pre = new Map([...sim.engagements].filter((e: any) => e.type === 'pass').map((e: any) => [e, { blocker: e.blocker, control: e.control }]));
    sim.tick();
    for (const [e, p] of pre) {
      if (!sim.engagements.includes(e) || e.blocker === p.blocker) continue;
      const k = e.blocker, d = e.defender, tk = traits(k, 'pass');
      const dist = Math.hypot(d.pos.x - k.pos.x, d.pos.y - k.pos.y), reach = k.profile.radius + d.profile.radius + tk.arm / 36 * 0.3;
      open.push({ t: sim.t, k, d, before: p.control, after: e.control, late: dist - reach, up: (k.body.support?.state ?? 'up') === 'up', move: e.move, released: false, reached: false });
    }
    for (const h of open) {
      if (sim.t - h.t > 0.5 || h.released) continue;
      if (Math.hypot(h.d.pos.x - h.k.pos.x, h.d.pos.y - h.k.pos.y) > 1.2) h.released = true;
    }
    if (sim.throwAt < 0) for (const h of open) if (!h.reached && Math.hypot(h.d.pos.x - sim.qb.pos.x, h.d.pos.y - sim.qb.pos.y) <= 2) h.reached = true;
  }
  H.push(...open);
}
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
console.log(`hand-overs: ${H.length} | control after p10/50/90 ${q(H.map((h) => h.after), .1).toFixed(2)}/${q(H.map((h) => h.after)).toFixed(2)}/${q(H.map((h) => h.after), .9).toFixed(2)} (exactly 0: ${pc(H.filter((h) => h.after === 0).length, H.length)}) | before p50 ${q(H.map((h) => h.before)).toFixed(2)}`);
for (const [lab, f] of [['keeper in reach (late <= 0)', (h: any) => h.late <= 0 && h.up], ['keeper late (> 0.1 yd)', (h: any) => h.late > 0.1 && h.up], ['keeper off his feet', (h: any) => !h.up]] as [string, (h: any) => boolean][]) {
  const S = H.filter(f); if (!S.length) { console.log(`  ${lab}: none`); continue; }
  console.log(`  ${lab} (n ${S.length}): control after p50 ${q(S.map((h) => h.after)).toFixed(2)} (p25 ${q(S.map((h) => h.after), .25).toFixed(2)}) | released within 0.5 s ${pc(S.filter((h) => h.released).length, S.length)} | reached the QB ${pc(S.filter((h) => h.reached).length, S.length)}`);
}
console.log(`  all: released within 0.5 s ${pc(H.filter((h) => h.released).length, H.length)} | reached the QB ${pc(H.filter((h) => h.reached).length, H.length)} | by move ${JSON.stringify(H.reduce((m: any, h) => (m[h.move] = (m[h.move] ?? 0) + 1, m), {}))}`);
