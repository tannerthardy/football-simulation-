// A pass protector's fall, traced (Flex, 2026-11-13; Integration: is it (a) his feet can't get back under him at the
// retreat speed, (b) he never asks to retreat and is toppled about a planted base, or (c) the press at the hands is
// applied above his centre with nothing in his lean to meet it?).
// For every OL in a pass rep who falls ('contact') before the throw: his state over the 1.0 s before the fall, sampled
// each tick: support (xi as a fraction of his base radius, along the press and across it; out; recent causes),
// velocity along the press (+ = the way he is pushed) against his request along it, the press |felt| and its
// direction against his facing, lean along the press, posture, the rusher's move. Medians at -1.0/-0.6/-0.3/-0.1 s.
// FALL_ROLE=DL traces the rusher in each pass rep instead ("interior" is then his blocker's position).
// usage: [flags] node --import tsx scripts/diag/effective-mass/fall-trace.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const DLROLE = process.env.FALL_ROLE === 'DL';
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const falls: { hist: any[]; cause: string; move: string; interior: boolean; fallAlong?: number; rusherNear?: number }[] = [];
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    const hist = new Map<any, any[]>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const pre = new Map<any, any>();
      for (const e of sim.engagements) {
        if (e.type !== 'pass' || !['LT', 'LG', 'C', 'RG', 'RT'].includes(e.blocker.slot)) continue;
        // FALL_ROLE=DL: trace the rusher instead (his blocker is the other man).
        const b = DLROLE ? e.defender : e.blocker, sup = b.body.support; if (!sup || sup.state !== 'up') continue;
        const other = DLROLE ? e.blocker : e.defender;
        const f = sup.felt, fl = Math.hypot(f.x, f.y) || 1e-6, ux = f.x / fl, uy = f.y / fl;  // the press's direction on him
        const base = supportParams(b.profile).baseRadius;
        const iv = sim.intents?.[b.idx]?.vel ?? { x: 0, y: 0 };
        const fa = Math.atan2(uy, ux) - b.body.facing, rel = Math.abs(Math.atan2(Math.sin(fa), Math.cos(fa))) * 180 / Math.PI;
        const c = sup.causes ?? { contact: 0, legs: 0, overspeed: 0 };
        const row = { t: sim.t, xiAlong: (sup.xi.x * ux + sup.xi.y * uy) / base, xiAcross: Math.abs(-sup.xi.x * uy + sup.xi.y * ux) / base,
          out: sup.out, vAlong: b.vel.x * ux + b.vel.y * uy, askAlong: iv.x * ux + iv.y * uy, press: fl, pressVsFacing: rel,
          leanAlong: -(sup.lean.x * ux + sup.lean.y * uy), posture: sup.posture, contact: c.contact, legs: c.legs, overspeed: c.overspeed,
          move: e.move, interior: ['LG', 'C', 'RG'].includes(e.blocker.slot), uPress: { x: ux, y: uy },
          rusherDist: Math.hypot(other.pos.x - b.pos.x, other.pos.y - b.pos.y), longArm: !!e.rusherHand, handsOff: !!e.hands?.off || (e.hands?.handsOn ?? 2) < 2 };
        pre.set(b, row);
      }
      const held = sim.carrier === sim.qb;
      tick();
      for (const [b, row] of pre) {
        const h = hist.get(b) ?? []; h.push(row); if (h.length > 25) h.shift(); hist.set(b, h);
        const sup = b.body.support;
        if (held && sup && sup.state !== 'up' && sim.t - sup.since < sim.dt + 1e-9) {
          // The fall's direction against the press felt the tick before (+1: the way he was pushed, back; -1: forward,
          // onto the man) and whether the rusher was still within 1.0 yd of him.
          const u = row.uPress, fd = sup.fall.x * u.x + sup.fall.y * u.y;
          falls.push({ hist: [...h], cause: sup.cause ?? '?', move: row.move, interior: row.interior, fallAlong: fd, rusherNear: row.rusherDist, longArm: row.longArm, handsOff: row.handsOff } as any);
        }
      }
    };
    return sim.run();
  } } });
}
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
const at = (h: any[], ago: number) => h.length ? h.reduce((best, r) => Math.abs(h[h.length - 1].t - ago - r.t) < Math.abs(h[h.length - 1].t - ago - best.t) ? r : best, h[0]) : null;
for (const [lab, inner] of [['interior', true], ['tackles', false]] as const) {
  const F = falls.filter((f) => f.interior === inner);
  const causes: Record<string, number> = {}, moves: Record<string, number> = {};
  for (const f of F) { causes[f.cause] = (causes[f.cause] ?? 0) + 1; moves[f.move] = (moves[f.move] ?? 0) + 1; }
  console.log(`${lab}: falls along the press (back) ${F.filter((f) => (f as any).fallAlong > 0.5).length}, against it (forward, onto the man) ${F.filter((f) => (f as any).fallAlong < -0.5).length}, sideways ${F.filter((f) => Math.abs((f as any).fallAlong) <= 0.5).length}`);
  console.log(`${lab}: in a long-arm ${F.filter((f: any) => f.longArm).length}, a blocker's hand off ${F.filter((f: any) => f.handsOff).length}, the other man within 1.0 yd at the fall ${F.filter((f: any) => (f.rusherNear ?? 9) <= 1.0).length}`);
  console.log(`${lab}: falls ${F.length} | cause ${JSON.stringify(causes)} | move ${Object.entries(moves).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const ago of [1.0, 0.6, 0.3, 0.1, 0]) {
    const R = F.map((f) => at(f.hist, ago)).filter(Boolean) as any[];
    console.log(`   ${ago.toFixed(1)} s before: xi along the press ${q(R.map((r) => r.xiAlong))} of his base (across ${q(R.map((r) => r.xiAcross))}), out ${q(R.map((r) => r.out))} s`
      + ` | velocity along the press ${q(R.map((r) => r.vAlong))}, asked ${q(R.map((r) => r.askAlong))} | press ${q(R.map((r) => r.press))} at ${q(R.map((r) => r.pressVsFacing))} deg off his facing`
      + ` | lean against it ${q(R.map((r) => r.leanAlong))} | posture ${q(R.map((r) => r.posture))} | causes contact/legs/overspeed ${q(R.map((r) => r.contact))}/${q(R.map((r) => r.legs))}/${q(R.map((r) => r.overspeed))}`);
  }
}
