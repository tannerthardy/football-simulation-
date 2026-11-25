// Pursuit redirect staged case (Run Game, 2026-11-25, Integration: the wide arc), measurement only. One pursuer (FS,
// Pursuit behavior, his picture current) running at DV yd/s along +x; the carrier DIST yd away at BEARING deg off his
// travel, forced across at SPEED on heading BEARING + CROSS deg (90: across his line of sight, away). Per tick: his speed,
// the angle of the line to the carrier off his travel, and each controller stage's request: its magnitude, its angle off
// his travel, and its component along his travel (negative = a brake). Summary: speed retained through the turn (min /
// entry), path length until he is heading within 20 deg of the carrier, tackled or not.
// Usage: <flags> node --import tsx turn-stage.mts [BEARING=110] [DV=7] [SPEED=7]
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Pursuit } = await import(`${W}/src/sim/behaviors/defense.ts`);
const { previewFreeMovement } = await import(`${W}/src/physics/movement-preview.ts`);
// FREEZE=1: the intercept solved once at the start with his own body's forecast (the turn included: the movement preview
// at full speed toward each candidate spot on the carrier's forecast path from his picture), the earliest he reaches
// within his arm; he runs at that fixed spot until within 3 yd of the carrier, then the controller resumes.
const FREEZE = process.env.FREEZE === '1';
const BEARING = Number(process.argv[2] ?? 110), DV = Number(process.argv[3] ?? 7), SPEED = Number(process.argv[4] ?? 7);
const DIST = Number(process.env.DIST ?? 6), CROSS = Number(process.env.CROSS ?? 90);
const r2 = (v: number) => Math.round(v * 100) / 100, deg = (r: number) => Math.round(r * 180 / Math.PI);
const ang = (a: any, b: any) => Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y));
const res: string[] = [];
for (const seed of [45, 46, 47]) {
  const sim: any = new PlaySim({ offense: pickOffense(generateTeam(new Rng(91), 'A offense', 'AOF'), '11'), defense: pickDefense(generateTeam(new Rng(92), 'A defense', 'ADF'), 'nickel'), seed,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'turn' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Cover 3' }, los: 20, ballY: 26, firstDownX: 30, audibles: false });
  const c = sim.slot('X')!, s = sim.slot('FS')!;
  for (const a of sim.agents) if (a !== c && a !== s) { a.downUntil = 99; a.body.pos = { x: 2 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 }; a.body.vel = { x: 0, y: 0 }; }
  const b = BEARING * Math.PI / 180, h = b + CROSS * Math.PI / 180;
  s.body.pos = { x: 50, y: 26 }; s.body.vel = { x: DV, y: 0 }; s.body.facing = 0;
  c.body.pos = { x: 50 + DIST * Math.cos(b), y: 26 + DIST * Math.sin(b) }; const cv = { x: SPEED * Math.cos(h), y: SPEED * Math.sin(h) }; c.body.vel = { ...cv }; c.body.facing = h;
  s.behavior = new Pursuit(); s.readAt = 0;
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 3; sim.throwAt = 2; sim.t = 3; sim.world.time = 3;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, c.idx);
  const stv = new Map<string, any>();
  sim.responsibility = new Proxy({}, { get: (_o, k) => k === 'decision' ? (a: any, _b: unknown, cm: any) => { if (a === s && cm?.vel) stv.set('decision', { ...cm.vel }); }
    : k === 'stage' ? (st: string, a: any, cm: any) => { if (a === s && cm?.vel) stv.set(st, { ...cm.vel }); } : k === 'stageAll' ? (st: string, I: any[]) => { const cm = I[s.idx]; if (cm?.vel) stv.set(st, { ...cm.vel }); } : () => undefined });
  let spot: any = null;
  if (FREEZE) {
    const seenC = sim.see(s, c), arm = c.profile.radius + s.profile.reach;
    for (let T = 0.2; T <= 4.0 + 1e-9 && !spot; T += 0.05) {
      const C = { x: seenC.pos.x + seenC.vel.x * T, y: seenC.pos.y + seenC.vel.y * T };
      const req = (body: any) => { const dx = C.x - body.pos.x, dy = C.y - body.pos.y, dl = Math.hypot(dx, dy) || 1; return { vel: { x: dx / dl * s.profile.vmax, y: dy / dl * s.profile.vmax }, facing: Math.atan2(dy, dx) }; };
      const smp = previewFreeMovement(s.body, req as any, sim.world.time, Math.ceil(T / sim.dt - 1e-9));
      const last = smp[smp.length - 1];
      if (last && Math.hypot(last.pos.x - C.x, last.pos.y - C.y) <= arm) spot = { ...C, T: r2(T) };
    }
  }
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (intents: any, dt: number) => { intents[c.idx] = { ...intents[c.idx], vel: { ...cv }, facing: h };
    if (spot && Math.hypot(c.pos.x - s.pos.x, c.pos.y - s.pos.y) > 3) { const dx = spot.x - s.pos.x, dy = spot.y - s.pos.y, dl = Math.hypot(dx, dy) || 1; intents[s.idx] = { ...intents[s.idx], vel: { x: dx / dl * s.profile.vmax, y: dy / dl * s.profile.vmax }, facing: Math.atan2(dy, dx) }; }
    return step(intents, dt); };
  let h0: number | null = null, hMin = Infinity, hMax = -Infinity, hPrev: number | null = null, hTravel = 0;
  const lines: string[] = []; let path = 0, minD = 99, prev = { ...s.pos }, minV = DV, turnedAt: number | null = null, turnPath: number | null = null;
  for (let k = 0; k < 100 && sim.phase === 'live'; k++) {
    stv.clear(); sim.tick();
    path += Math.hypot(s.pos.x - prev.x, s.pos.y - prev.y); prev = { ...s.pos };
    const v = s.vel, sp = Math.hypot(v.x, v.y); minV = Math.min(minV, sp);
    const to = { x: c.pos.x - s.pos.x, y: c.pos.y - s.pos.y }, dd = Math.hypot(to.x, to.y); minD = Math.min(minD, dd);
    const fin = sim.intents[s.idx]?.vel;
    if (turnedAt === null && sp > 0.5 && fin && Math.hypot(fin.x, fin.y) > 0.5 && ang(v, fin) < 15 * Math.PI / 180) { turnedAt = r2(sim.t - 3); turnPath = r2(path); }
    const dq = stv.get('decision');
    if (dq && turnedAt === null) { const hq = Math.atan2(dq.y, dq.x); if (h0 === null) h0 = hq; const rel = Math.atan2(Math.sin(hq - h0), Math.cos(hq - h0)); hMin = Math.min(hMin, rel); hMax = Math.max(hMax, rel); if (hPrev !== null) hTravel += Math.abs(Math.atan2(Math.sin(hq - hPrev), Math.cos(hq - hPrev))); hPrev = hq; }
    const req = (q: any) => q ? `|${r2(Math.hypot(q.x, q.y))}| ${sp > 0.1 ? deg(ang(v, q)) : '-'}deg along ${sp > 0.1 ? r2((q.x * v.x + q.y * v.y) / sp) : '-'}` : '-';
    const ev = sim.events.filter((e: any) => e.a === s.idx && Math.abs(e.t - sim.t) < 1e-6 && ['tackle_wrap', 'missed_tackle'].includes(e.type)).map((e: any) => e.type);
    lines.push(`t${r2(sim.t - 3)} d=${r2(dd)} v=${r2(sp)} toCarrier ${deg(ang(v, to))}deg | decision ${req(stv.get('decision'))} | final ${req(sim.intents[s.idx]?.vel)} ${ev.join(',')}`);
  }
  const tk = sim.events.find((e: any) => e.a === s.idx && e.type === 'tackle_wrap');
  res.push(`seed ${seed}: requested heading moved ${deg(hMax - hMin)} deg (total travel ${deg(hTravel)}) before he came round; min speed ${r2(minV)} (${r2(minV / DV)} of entry), came round to within 15 deg of his request at ${turnedAt} s after ${turnPath} yd of path; closest ${r2(minD)}${spot ? `; frozen spot at T ${spot.T}` : ''}; ${tk ? `wrap at ${r2(tk.t - 3)} s` : 'no wrap'}`);
  if (seed === 45) console.log(lines.join('\n'));
}
console.log(res.join('\n'));
