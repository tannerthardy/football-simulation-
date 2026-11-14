// DL falls in pass reps, classified (Flex, 2026-11-14; Integration: DL falls 8.5-10.1 /100 dropbacks against NFL ~1).
// Per DL who goes off his feet (support leaves 'up') in a pass rep before the throw: role, move, riding, press peak over
// the 0.6 s before and at the fall, his lean along the press at the peak, the fall direction against the press (+: the
// way the press pushed him, back; -: forward, onto the man), his asked vs achieved speed along his aim, the blocker's
// hand state, then 1.5 s after: time to 'up' again, and his speed while down (eye-check that down is down).
// usage: [flags] node --import tsx scripts/diag/effective-mass/dl-falls.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: any[] = []; let drops = 0;
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    drops++;
    const hist = new Map<any, any[]>(), follow: any[] = [];
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const pre = new Map<any, any>();
      for (const e of sim.engagements) {
        if (e.type !== 'pass' || !/^(DE|DT|NT)/.test(e.defender.slot)) continue;
        const d = e.defender, sup = d.body.support; if (!sup || sup.state !== 'up') continue;
        const f = sup.felt, fl = Math.hypot(f.x, f.y) || 1e-6, u = { x: f.x / fl, y: f.y / fl };
        const iv = sim.intents?.[d.idx]?.vel ?? { x: 0, y: 0 };
        pre.set(d, { t: sim.t, press: fl, u, lean: -(sup.lean.x * u.x + sup.lean.y * u.y), move: e.move, riding: !!e.riding,
          ask: Math.hypot(iv.x, iv.y), got: Math.hypot(d.vel.x, d.vel.y), handsOn: e.hands ? (e.hands.handsOn ?? 2) : 0, handsOff: !!e.hands?.off,
          bVel: Math.hypot(e.blocker.vel.x, e.blocker.vel.y), b: e.blocker.slot, phi: e.phi * e.side, posture: sup.posture });
      }
      const held = sim.carrier === sim.qb && sim.throwAt < 0;
      tick();
      for (const [d, row] of pre) {
        const h = hist.get(d) ?? []; h.push(row); if (h.length > 13) h.shift(); hist.set(d, h);
        const sup = d.body.support;
        if (held && sim.t >= 0.5 && sup && sup.state !== 'up' && sim.t - sup.since < sim.dt + 1e-9) {
          let pk = h[0]; for (const r of h) if (r.press > pk.press) pk = r;
          const fd = sup.fall.x * row.u.x + sup.fall.y * row.u.y;
          const r = { t: sim.t, slot: d.slot, edge: /^DE/.test(d.slot), move: row.move, riding: row.riding, peak: pk.press, leanAtPeak: pk.lean, pressAtFall: row.press,
            leanAtFall: row.lean, fd, ask: row.ask, got: row.got, handsOn: row.handsOn, b: row.b, bVel: row.bVel, phi: row.phi, d, down: 0, moved: 0, last: { ...d.pos }, upAt: null as number | null };
          rows.push(r); follow.push(r);
        }
      }
      for (const r of follow) {
        if (r.upAt !== null || sim.t - r.t > 1.5) continue;
        const sup = r.d.body.support;
        if (sup?.state === 'up') { r.upAt = sim.t - r.t; continue; }
        r.moved += Math.hypot(r.d.pos.x - r.last.x, r.d.pos.y - r.last.y); r.last = { ...r.d.pos }; r.down = sim.t - r.t;
      }
    };
    return sim.run();
  } } });
}
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
console.log(`dropbacks ${drops} | DL falls in a pass rep before the throw ${rows.length} (${(100 * rows.length / drops).toFixed(1)} /100)`);
const cls = (r: any) => r.fd < -0.3 ? (r.pressAtFall < 0.5 * r.peak ? 'forward, press removed' : 'forward, press kept') : r.fd > 0.3 ? 'back, driven over' : 'sideways';
for (const edge of [false, true]) {
  const R = rows.filter((r) => r.edge === edge);
  const by = new Map<string, any[]>(); for (const r of R) { const k = cls(r); by.set(k, [...(by.get(k) ?? []), r]); }
  console.log(`${edge ? 'edge (DE)' : 'interior (DT)'}: falls ${R.length}`);
  for (const [k, S] of by) {
    const mv = new Map<string, number>(); for (const r of S) mv.set(r.move, (mv.get(r.move) ?? 0) + 1);
    console.log(`  ${k.padEnd(24)} n ${String(S.length).padStart(3)} | moves ${[...mv].map(([m, n]) => `${m} ${n}`).join(', ')} | riding ${S.filter((r) => r.riding).length}`
      + ` | press peak ${q(S.map((r) => r.peak))} -> at fall ${q(S.map((r) => r.pressAtFall))} N | lean at peak ${q(S.map((r) => r.leanAtPeak))} | asked ${q(S.map((r) => r.ask))} got ${q(S.map((r) => r.got))} yd/s`
      + ` | blocker hands on ${q(S.map((r) => r.handsOn))}, speed ${q(S.map((r) => r.bVel))} | leverage ${q(S.map((r) => r.phi))} | down for ${q(S.map((r) => r.upAt ?? r.down))} s, moved ${q(S.map((r) => r.moved))} yd`);
  }
}
const pick = rows.filter((_, i) => i % Math.max(1, Math.floor(rows.length / 12)) === 0).slice(0, 12);
for (const r of pick) console.log(`  eye ${r.slot} t ${r.t.toFixed(2)} ${cls(r)} (${r.move}${r.riding ? ', ridden' : ''}) vs ${r.b} | press ${r.peak.toFixed(0)} -> ${r.pressAtFall.toFixed(0)} N, lean ${r.leanAtPeak.toFixed(0)} -> ${r.leanAtFall.toFixed(0)} | asked ${r.ask.toFixed(1)} got ${r.got.toFixed(1)} | down ${(r.upAt ?? r.down).toFixed(2)} s${r.upAt === null ? '+' : ''}, moved ${r.moved.toFixed(2)} yd`);
