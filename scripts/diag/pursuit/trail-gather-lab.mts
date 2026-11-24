// Staged trail x gather (2026-11-24; the user's practice: stage the simple case first). One carrier on a fixed straight
// path, a lead pursuer and a trail pursuer on the same line to him, no blockers; run per flag combination via env
// (TRAIL_LEVERAGE, GATHER_FRONT). Stage 'straight': the carrier runs 7 yd/s straight. Stage 'cut': he cuts 45 deg away
// from the lead when the lead is CUT_AT (2.5) yd away, to stage the lead's miss. 'behind' / 'behind-cut': the same with
// the trail man chasing from behind the carrier instead of following the lead's line.
// Per rep: the first attempt (lead / trail, made / missed), whether the trail attempts after a lead miss and makes it,
// the trail's distance and lateral offset from the carrier when the lead's attempt happens, yards from the start.
// Usage (repo root, a build with the flags): node --import tsx trail-gather-lab.mts STAGE SEEDS REPS
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Pursuit } = await import(`${W}/src/sim/behaviors/defense.ts`);
const [STAGE = 'straight', SEEDS = '12', REPS = '10'] = process.argv.slice(2);
const CUT_AT = Number(process.env.CUT_AT ?? 2.5);
const r2 = (v: number) => Math.round(v * 100) / 100;
const out: any[] = [];
for (let seed = 1; seed <= Number(SEEDS); seed++) {
  const rng = new Rng(seed);
  const offense = pickOffense(generateTeam(rng, 'O', 'OFF'), '11'), defense = pickDefense(generateTeam(rng, 'D', 'DEF'), 'nickel');
  for (let i = 0; i < Number(REPS); i++) {
    const sim = new PlaySim({ offense, defense,
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.smash, label: 'lab' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
      los: 30, ballY: 26.67, firstDownX: 40, seed: rng.nextU32() } as any) as any;
    for (const a of sim.agents) { a.body.pos = { x: 5 + a.idx * 0.1, y: a.idx * 2 + 1 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; }
    const c = sim.slot('Z'); c.downUntil = -1; c.body.pos = { x: 50, y: 20 }; c.body.vel = { x: 7, y: 0 }; c.body.facing = 0;
    sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0; sim.catchX = 50;
    let cut = false;
    c.behavior = { kind: 'carrier', update: () => ({ vel: cut ? { x: 7 * Math.SQRT1_2, y: -7 * Math.SQRT1_2 } : { x: 7, y: 0 }, facing: cut ? -Math.PI / 4 : 0 }) };
    // Lead: 6 yd ahead, 5 yd inside (+y), coming across; trail: 4 yd farther back along the same line, same motion.
    const lead = sim.slot('FS'), trail = sim.slot('SS');
    for (const [d, k] of [[lead, 0], [trail, 1]] as const) {
      d.downUntil = -1; d.body.pos = { x: 56 + 4 * 0.77 * k, y: 25 + 4 * 0.64 * k }; d.body.vel = { x: -2, y: -4 }; d.body.facing = Math.atan2(-4, -2);
      d.readAt = 0; d.behavior = new Pursuit();
    }
    // 'behind' stages: the trail man chases from behind the carrier and inside (3 yd back, 2 yd inside, at 7 yd/s), the
    // geometry GATHER_FRONT changes (a pursuer beside or behind keeps his intercept to his last arm's length).
    if (STAGE.startsWith('behind')) { trail.body.pos = { x: 47, y: 22 }; trail.body.vel = { x: 7, y: 0 }; trail.body.facing = 0; }
    for (const a of sim.agents) if (a.downUntil === 99) a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
    for (let k = 0; k < 10; k++) sim.perception.record(sim.agents.map((a: any) => a.body));
    let seen = 0, first: any = null, leadMiss = false, trailAfter: any = null, atLead: any = null;
    while (sim.phase === 'live' && sim.t < 6) {
      if (STAGE.endsWith('cut') && !cut && Math.hypot(lead.pos.x - c.pos.x, lead.pos.y - c.pos.y) < CUT_AT) cut = true;
      sim.tick();
      for (; seen < sim.events.length; seen++) {
        const e = sim.events[seen];
        if (e.type !== 'missed_tackle' && e.type !== 'tackle_wrap') continue;
        const who = sim.agents[e.a] === lead ? 'lead' : sim.agents[e.a] === trail ? 'trail' : 'other';
        const made = e.type === 'tackle_wrap';
        if (!first) { first = { who, made }; if (who === 'lead') {
          const cs = Math.hypot(c.vel.x, c.vel.y) || 1, ux = c.vel.x / cs, uy = c.vel.y / cs;
          atLead = { dist: r2(Math.hypot(trail.pos.x - c.pos.x, trail.pos.y - c.pos.y)), lat: r2((trail.pos.y - c.pos.y) * ux - (trail.pos.x - c.pos.x) * uy), speed: r2(Math.hypot(trail.vel.x, trail.vel.y)) }; } }
        if (who === 'lead' && !made) leadMiss = true;
        if (who === 'trail' && leadMiss && !trailAfter) trailAfter = { made, t: r2(sim.t) };
      }
    }
    out.push({ seed, first, leadMiss, trailAfter, atLead, yards: r2((sim.endSpot?.x ?? c.pos.x) - 50), outcome: sim.outcome });
  }
}
const n = out.length, pct = (k: number) => `${(100 * k / n).toFixed(0)}%`;
const q = (v: number[]) => { const y = v.filter(x => x != null).sort((a, b) => a - b); return y.length ? y[Math.floor(y.length / 2)] : null; };
const LM = out.filter(r => r.leadMiss);
console.log(`stage ${STAGE} TRAIL_LEVERAGE=${process.env.TRAIL_LEVERAGE ?? '-'} GATHER_FRONT=${process.env.GATHER_FRONT ?? '-'} reps ${n}`
  + ` | first attempt: lead made ${pct(out.filter(r => r.first?.who === 'lead' && r.first.made).length)}, lead missed ${pct(out.filter(r => r.first?.who === 'lead' && !r.first.made).length)}, trail ${pct(out.filter(r => r.first?.who === 'trail').length)}, none ${pct(out.filter(r => !r.first).length)}`
  + ` | after a lead miss (n ${LM.length}): trail attempts ${(100 * LM.filter(r => r.trailAfter).length / Math.max(1, LM.length)).toFixed(0)}%, makes ${(100 * LM.filter(r => r.trailAfter?.made).length / Math.max(1, LM.length)).toFixed(0)}%`
  + ` | trail at the lead's attempt: dist p50 ${q(out.map(r => r.atLead?.dist))}, lateral p50 ${q(out.map(r => r.atLead?.lat))}, speed ${q(out.map(r => r.atLead?.speed))}`
  + ` | yards p50 ${q(out.map(r => r.yards))} tackled ${pct(out.filter(r => r.outcome === 'tackle').length)}`);
