// The edge's first contact with the tackle (Flex, 2026-11-14; Integration: is it his request or the tackle's hands, and
// does the hands' joint resist his travel across them as stiffly as a bull?). Per edge (DE) pass rep against a tackle,
// over the 0.3 s after the rep starts: the load on the rusher (support.load) split along the tackle-to-rusher line (+ =
// pushing him away: punch, anchor) and across it (tangential, + = against his own travel across); his requested speed
// and how much of it points across the tackle (toward his corner); his achieved speed; the tackle's hand joint (normal and
// tangential force); his offset outside the tackle at the start. By the landing: outside half (0.3-0.9 yd) and wide.
// usage: [flags] node --import tsx scripts/diag/effective-mass/edge-contact.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const open: any[] = [], seen = new Set<any>(); const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    for (const e of sim.engagements) if (e.type === 'pass' && !seen.has(e) && /^DE/.test(e.defender.slot) && ['LT', 'RT'].includes(e.blocker.slot)) {
      seen.add(e);
      const side = Math.sign(e.defender.pos.y - sim.ballY) || 1;
      open.push({ e, t0: sim.t, side, off: side * (e.defender.pos.y - e.blocker.pos.y), v0: Math.hypot(e.defender.vel.x, e.defender.vel.y), n: 0, ln: 0, lt: 0, req: 0, reqAcross: 0, jn: 0, jt: 0 });
    }
    for (const r of open) {
      if (r.done) continue;
      const e = r.e, d = e.defender, b = e.blocker;
      if (!sim.engagements.includes(e) || sim.t - r.t0 > 0.3) { r.done = true; r.v1 = Math.hypot(d.vel.x, d.vel.y); rows.push(r); continue; }
      const nx = d.pos.x - b.pos.x, ny = d.pos.y - b.pos.y, L = Math.hypot(nx, ny) || 1, n = { x: nx / L, y: ny / L };
      const iv = sim.intents?.[d.idx]?.vel ?? { x: 0, y: 0 };
      let t = { x: -n.y, y: n.x }; if (iv.x * t.x + iv.y * t.y < 0) t = { x: -t.x, y: -t.y };   // across, the way he asks to go
      const Ld = d.body.support?.load ?? { x: 0, y: 0 };
      const power = e.move === 'bull' || e.move === 'longarm';
      if (!power) { r.np = (r.np ?? 0) + 1; r.reqIntoNP = (r.reqIntoNP ?? 0) - (iv.x * n.x + iv.y * n.y); r.reqAcrossNP = (r.reqAcrossNP ?? 0) + (iv.x * t.x + iv.y * t.y); } else r.pw = (r.pw ?? 0) + 1;
      r.ln += Ld.x * n.x + Ld.y * n.y; r.lt += -(Ld.x * t.x + Ld.y * t.y); r.n++;
      r.req += Math.hypot(iv.x, iv.y); r.reqAcross += iv.x * t.x + iv.y * t.y; r.reqInto = (r.reqInto ?? 0) - (iv.x * n.x + iv.y * n.y);
      r.got = (r.got ?? 0) + (d.vel.x * t.x + d.vel.y * t.y); r.gotInto = (r.gotInto ?? 0) - (d.vel.x * n.x + d.vel.y * n.y);
      const h = e.hands; if (h && !h.off) { r.jn += Math.max(0, h.normalForce ?? 0); r.jt += Math.abs(h.tangentForce ?? 0); }
    }
  };
  return sim.run();
} } });
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(0) : 'nan'; };
const q2 = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const [lab, f] of [['all', (r: any) => true], ['head-up (< 0.3 yd)', (r: any) => Math.abs(r.off) < 0.3], ['outside half (0.3-0.9)', (r: any) => r.off >= 0.3 && r.off < 0.9], ['wide (>= 0.9)', (r: any) => r.off >= 0.9]] as const) {
  const R = rows.filter(f); if (!R.length) continue;
  const m = (k: string) => R.map((r) => r[k] / Math.max(1, r.n));
  console.log(`${lab.padEnd(24)} n ${String(R.length).padStart(4)} | his speed at the rep's start ${q2(R.map((r) => r.v0))} -> 0.3 s ${q2(R.map((r) => r.v1))} yd/s | asked ${q2(m('req'))} yd/s: across the tackle ${q2(m('reqAcross'))}, into him ${q2(m('reqInto'))} (achieved across ${q2(m('got'))}, into ${q2(m('gotInto'))}) | power-move ticks ${(100 * R.reduce((a, r) => a + (r.pw ?? 0), 0) / Math.max(1, R.reduce((a, r) => a + r.n, 0))).toFixed(0)}%; on the others asked into ${q2(R.filter((r) => r.np).map((r) => r.reqIntoNP / r.np))}, across ${q2(R.filter((r) => r.np).map((r) => r.reqAcrossNP / r.np))} | load on him along the line (away) p50 ${q(m('ln'))} N, across against his travel p50 ${q(m('lt'))} N (p75 ${q(m('lt'), .75)}) | tackle's hands: normal ${q(m('jn'))} N, tangential ${q(m('jt'))} N`);
}
