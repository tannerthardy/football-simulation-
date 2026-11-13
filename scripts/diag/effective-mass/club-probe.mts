// RUSH_HANDS stage 2: clubs thrown in games, and whether the blocker's hand came off, by his extension at the throw.
// usage: RUSH_HANDS=1 node --import tsx scripts/diag/effective-mass/club-probe.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: any[] = [];
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const await_import_free_armForce = (a: any) => supportParams(a.profile).armForce;
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    const open = new Map<any, any>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const before = new Map(sim.engagements.filter((e: any) => e.type === 'pass').map((e: any) => [e, { move: e.move, until: e.moveUntil, off: !!e.hands?.off }]));
      tick();
      for (const e of sim.engagements) {
        if (e.type !== 'pass' || !e.hands) continue;
        const b0: any = before.get(e);
        if (b0 && e.move === 'club' && e.moveUntil !== b0.until && !e.moveOk && !b0.off) {
          const bodies = e.blocker.profile.radius + e.defender.profile.radius, arm = e.blocker.player.measurables.armIn / 36;
          open.set(e, { t: sim.t, ext: (e.hands.extension - bodies) / arm, N: e.hands.normalForce ?? 0, grip: !!e.hands.grip, off: false, until: e.moveUntil + 0.05,
            edge: ['LT', 'RT'].includes(e.blocker.slot), fin: e.defender.r('passRushFinesse'), who: e.defender.player.id, unloaded: (e.hands.normalForce ?? 0) < 0.2 * supportParams(e.blocker.profile).pressForce,
            H: sim.world.handHold(e.hands), steer: e.hands.steer, hold: e.hands.hold, lever: Math.min(1, 0.25 * arm / Math.max(0.25 * arm, e.hands.extension - bodies)),
            F: (await_import_free_armForce(e.defender)), off0: e.hands.handOffset ?? 0, lastN: (sim.world as any).lastHandN.get(e.hands) ?? -1, ctl: e.control });
        }
        const r = open.get(e);
        if (r && !r.off && e.hands.off) { r.off = true; r.offAt = sim.t; }
      }
      for (const [e, r] of open) if (sim.t > r.until) { rows.push(r); open.delete(e); }
    };
    const res = sim.run();
    for (const r of open.values()) rows.push(r);
    return res; } } });
}
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
console.log(`clubs ${rows.length}: hand off ${pc(rows.filter((r) => r.off).length, rows.length)}`);
for (const [lab, lo, hi] of [['bent (< 0.4 arm)', -9, 0.4], ['mid (0.4-0.75)', 0.4, 0.75], ['extended (>= 0.75)', 0.75, 9]] as const) {
  const R = rows.filter((r) => r.ext >= lo && r.ext < hi);
  console.log(`  blocker ${lab}: ${R.length} | off ${pc(R.filter((r) => r.off).length, R.length)} | pressed (N > 200) ${pc(R.filter((r) => r.N > 200).length, R.length)}, off when pressed ${pc(R.filter((r) => r.N > 200 && r.off).length, R.filter((r) => r.N > 200).length)} | gripped ${pc(R.filter((r) => r.grip).length, R.length)}`);
}
for (const [lab, lo, hi] of [['finesse < 0.4', -1, 0.4], ['0.4-0.7', 0.4, 0.7], ['>= 0.7', 0.7, 2]] as const) {
  const R = rows.filter((r) => r.fin >= lo && r.fin < hi);
  console.log(`  rusher ${lab}: ${R.length} | off ${pc(R.filter((r) => r.off).length, R.length)}`);
}
const q = (v: number[], f = .5) => { const s2 = [...v].sort((a, b) => a - b); return s2.length ? s2[Math.floor(f * (s2.length - 1))].toFixed(0) : 'nan'; };
console.log(`  at the throw p25/50/75: club force ${q(rows.map((r) => r.F), .25)}/${q(rows.map((r) => r.F))}/${q(rows.map((r) => r.F), .75)} | hold H ${q(rows.map((r) => r.H), .25)}/${q(rows.map((r) => r.H))}/${q(rows.map((r) => r.H), .75)} | steer ${q(rows.map((r) => r.steer))} x lever ${(rows.map((r) => r.lever).sort((a, b) => a - b)[rows.length >> 1] ?? 0).toFixed(2)} | grip hold ${q(rows.map((r) => r.hold))} | press N ${q(rows.map((r) => r.N))}`);
for (const [lab, lo, hi] of [['bent', -9, 0.4], ['mid', 0.4, 0.75], ['extended', 0.75, 9]] as const) {
  const R = rows.filter((r) => r.ext >= lo && r.ext < hi);
  console.log(`  ${lab}: H p50 ${q(R.map((r) => r.H))} | steer ${q(R.map((r) => r.steer))} | lastN ${q(R.map((r) => r.lastN))} | |offset| at throw p50 ${(R.map((r) => Math.abs(r.off0)).sort((a, b) => a - b)[R.length >> 1] ?? 0).toFixed(3)} | control p50 ${(R.map((r) => r.ctl).sort((a, b) => a - b)[R.length >> 1] ?? 0).toFixed(2)} | off ${R.filter((r) => r.off).length}/${R.length}`);
}
const by = new Map<string, any[]>(); for (const r of rows) { const a = by.get(r.who) ?? []; a.push(r); by.set(r.who, a); }
const players = [...by.values()].filter((a) => a.length >= 8).map((a) => ({ n: a.length, fin: a[0].fin, ok: a.filter((r) => r.off).length / a.length }));
players.sort((x, y) => x.fin - y.fin);
console.log(`  clubs thrown at an unloaded hand ${pc(rows.filter((r) => r.unloaded).length, rows.length)}, off then ${pc(rows.filter((r) => r.unloaded && r.off).length, rows.filter((r) => r.unloaded).length)}; at a loaded hand off ${pc(rows.filter((r) => !r.unloaded && r.off).length, rows.filter((r) => !r.unloaded).length)}`);
console.log(`  by player (>= 8 clubs, ${players.length}): ` + players.map((p) => `fin ${p.fin.toFixed(2)} ${(100 * p.ok).toFixed(0)}% (n ${p.n})`).join(' | '));
for (const [lab, f] of [['against tackles', (r: any) => r.edge], ['against guards/center', (r: any) => !r.edge]] as const) {
  const R = rows.filter(f);
  console.log(`  ${lab}: clubs ${R.length} | at an unloaded hand ${pc(R.filter((r) => r.unloaded).length, R.length)} | off ${pc(R.filter((r) => r.off).length, R.length)} | press N p50 ${q(R.map((r) => r.N))} | extension p50 ${(R.map((r) => r.ext).sort((a, b) => a - b)[R.length >> 1] ?? 0).toFixed(2)} arm`);
}
