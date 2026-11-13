// Which branch is the blocker in when ride-pair.py counts a frame as "ridden" (Flex, 2026-11-13, after HAND_SITE's
// miss)? Same geometry as ride-pair.py: on a dropback, each DL/LB with the nearest OL within 1.2 yd, the rusher level
// with or past him toward the QB (dx <= +0.2 along the QB-blocker line), 0.5 s to the throw. Per such tick: is that
// OL in a pass rep with this man (riding / past but not riding / engaged otherwise), engaged with another man, or in
// no rep (released or never engaged); his requested and achieved speed, the rusher's speed, the centre distance.
// usage: [flags] node --import tsx scripts/diag/effective-mass/ridden-branch.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: { cls: string; tackle: boolean; req: number; got: number; man: number; cd: number }[] = [];
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    const tick = sim.tick.bind(sim);
    let ol: any[] | null = null, tackles = new Set<any>();
    sim.tick = () => {
      tick();
      if (!ol) {
        ol = sim.offense.filter((a: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot));
        const ys = [...ol].sort((a: any, b: any) => a.pos.y - b.pos.y); tackles = new Set([ys[0], ys[ys.length - 1]]);
      }
      if (sim.t < 0.5 || sim.ballThrown || sim.outcome || !sim.qb || sim.carrier !== sim.qb) return;
      const qb = sim.qb.pos;
      for (const d of sim.defense) {
        if (!/^(DE|DT|NT|LB)/.test(d.slot)) continue;
        let best: any = null, bd = 1.2;
        for (const o of ol!) { const dd = Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y); if (dd <= bd) { bd = dd; best = o; } }
        if (!best) continue;
        const lx = best.pos.x - qb.x, ly = best.pos.y - qb.y, ll = Math.hypot(lx, ly) || 1e-6;
        const dx = ((d.pos.x - best.pos.x) * lx + (d.pos.y - best.pos.y) * ly) / ll;
        if (dx > 0.2) continue;
        const reps = sim.engagements.filter((e: any) => e.type === 'pass' && (e.blocker === best || e.helpers?.includes(best)));
        const mine = reps.find((e: any) => e.defender === d);
        const cls = mine ? (mine.blocker !== best ? 'helper on him' : mine.riding ? 'riding' : 'his rep, not riding') : reps.length ? 'engaged with another man' : 'in no rep';
        const iv = sim.intents?.[best.idx]?.vel;
        rows.push({ cls, tackle: tackles.has(best), req: iv ? Math.hypot(iv.x, iv.y) : NaN, got: Math.hypot(best.vel.x, best.vel.y), man: Math.hypot(d.vel.x, d.vel.y), cd: bd });
      }
    };
    return sim.run();
  } } });
}
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const [lab, t] of [['interior', false], ['tackles', true]] as const) {
  const R = rows.filter((r) => r.tackle === t);
  console.log(`${lab}: ridden frames ${R.length}`);
  for (const c of ['riding', 'his rep, not riding', 'helper on him', 'engaged with another man', 'in no rep']) {
    const C = R.filter((r) => r.cls === c); if (!C.length) continue;
    console.log(`   ${c.padEnd(26)} ${(100 * C.length / R.length).toFixed(0).padStart(3)}% | blocker request ${q(C.map((r) => r.req))} achieved ${q(C.map((r) => r.got))} | rusher ${q(C.map((r) => r.man))} | centre distance ${q(C.map((r) => r.cd))} (< 0.65: ${(100 * C.filter((r) => r.cd < 0.65).length / C.length).toFixed(0)}%)`);
  }
}
