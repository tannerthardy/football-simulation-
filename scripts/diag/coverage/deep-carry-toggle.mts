// COV-15 reproduction: the dither budget's panel (pass plays), zone and man defenders apart (dither-core's GROUP
// remapped). Per deep-open-carry behaviour reversal (dither-core's log), whether DeepCoverage.choose flipped between
// returning the original command and its override (best's sign) inside the reversal's 0.3 s, and the requested speed
// on each side. Read-only.   node --import tsx scripts/diag/coverage/deep-carry-toggle.mts
import { readFileSync } from 'node:fs';
const W = process.cwd();
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense } = await import(`${W}/src/league/team.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const core = await import(`${W}/scripts/diag/effective-mass/dither-core.ts`);
const { DeepCoverage } = await import(`${W}/src/sim/coverage-leverage.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { ZoneCoverage, ManCoverage } = await import(`${W}/src/sim/behaviors/defense.ts`);
core.instrument(PlaySim);
core.GROUP.zone = 'zone'; core.GROUP.man = 'man';
const ACC: any = { __log: [] };
const ov = new Map<any, Map<number, { over: boolean; sp: number }>>();
const lab = new Map<any, Map<number, string>>();
let simNow: any = null;
const ch0 = DeepCoverage.prototype.choose;
DeepCoverage.prototype.choose = function (a: any, seen: any, cue: any, rp: any, cushion: number, original: any, now: number, model: any) {
  const r = ch0.call(this, a, seen, cue, rp, cushion, original, now, model);
  let m = ov.get(a); if (!m) ov.set(a, m = new Map());
  m.set(+now.toFixed(3), { over: r !== original, sp: Math.hypot(r.vel.x, r.vel.y) });
  return r;
};
for (const C of [ZoneCoverage, ManCoverage]) { const up = C.prototype.update; C.prototype.update = function (a: any, sim: any) { const c = up.call(this, a, sim);
  let m = lab.get(a); if (!m) lab.set(a, m = new Map()); m.set(+sim.t.toFixed(3), facingTechnique(c)?.label ?? '');
  const dc = a.__dc; if (dc && Math.abs(dc.t - sim.t) < 1e-6) { let h = DCH.get(a); if (!h) DCH.set(a, h = new Map()); h.set(+sim.t.toFixed(3), { ...dc, out: { ...c.vel }, f: c.facing, ty2: a.__dty && Math.abs(a.__dty.t - sim.t) < 1e-6 ? { ...a.__dty } : null }); }
  return c; }; }
const DCH = new Map<any, Map<number, any>>();
const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 });
const defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
const { pickOffense } = await import(`${W}/src/league/team.ts`);
const go = (setup: any) => { const sim: any = new PlaySim(setup); core.watch(sim, ACC); sim.run(); };
for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'slant_flat', 'four_verts', 'y_cross', 'flood']) for (let seed = 1; seed <= 5; seed++)
  for (const cov of ['cover3', 'cover2', 'cover1', 'cover4']) {
    const formation = FORMATION_BY_ID.gun_doubles_11;
    go({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, zoneStyle: 'spot', label: 'x' },
      los: 35, ballY: 26.65, firstDownX: 45, seed });
  }
const c: Record<string, number> = {}; let all = 0, carry = 0; const sps: number[][] = [];
for (const e of ACC.__log) { if (e.src !== 'behaviour') continue; all++;
  const L = lab.get(e.who)?.get(+e.t.toFixed(3)) ?? ''; if (L !== 'deep-open-carry') continue; carry++;
  const m = ov.get(e.who); const w: any[] = []; for (let dt = -0.05; dt <= 0.3001; dt += 0.05) { const q = m?.get(+(e.t + dt).toFixed(3)); if (q) w.push(q); }
  let flips = 0; for (let i = 1; i < w.length; i++) if (w[i].over !== w[i - 1].over) flips++;
  const k = !w.length ? 'no choose' : flips >= 2 ? 'override toggled back and forth' : flips === 1 ? 'override switched once' : w[0].over ? 'override steady' : 'original steady';
  c[k] = (c[k] ?? 0) + 1; if (flips && sps.length < 8) sps.push(w.map((q) => +q.sp.toFixed(1) * (q.over ? 1 : -1)));
}
let ticks = 0, fl = 0; for (const m of ov.values()) { let p: boolean | null = null; for (const q of m.values()) { ticks++; if (p !== null && q.over !== p) fl++; p = q.over; } }
console.log(JSON.stringify({ behaviourReversals: all, deepOpenCarry: carry, byChoose: c, chooseTicks: ticks, overrideFlipsPerTick: +(fl / ticks).toFixed(3) }));
{ const k2: Record<string, number> = {}; let shown = 0;
  for (const e of ACC.__log) { if (e.src !== 'behaviour') continue; if ((lab.get(e.who)?.get(+e.t.toFixed(3)) ?? '') !== 'deep-open-carry') continue;
    const h = DCH.get(e.who); if (!h) { k2['no tap'] = (k2['no tap'] ?? 0) + 1; continue; }
    const w: any[] = []; for (let dt = -0.05; dt <= 0.3001; dt += 0.05) { const q = h.get(+(e.t + dt).toFixed(3)); if (q) w.push(q); }
    const ch = new Set<string>();
    for (let i = 1; i < w.length; i++) { const p = w[i - 1], q = w[i];
      if (p.label !== q.label) ch.add('command technique ' + p.label + '>' + q.label);
      if ((p.req.x > p.cmd.x + 1e-6) !== (q.req.x > q.cmd.x + 1e-6)) ch.add('floor engaged/released');
      if (Math.hypot(q.tx - p.tx, q.ty - p.ty) > 0.7) { const A = p.ty2, B = q.ty2;
        ch.add(!A || !B ? 'target jump (no tap)' : A.n !== B.n ? 'target: vertical count ' + Math.min(A.n, 2) + '>' + Math.min(B.n, 2) : A.deep !== B.deep || A.second !== B.second ? 'target: verticals changed'
          : A.w !== B.w ? 'target: eyes weight' : (A.key === null) !== (B.key === null) || (A.key !== null && Math.abs(A.key - B.key) > 0.7) ? 'target: half key' : A.ins !== B.ins ? 'target: inside sign' : 'target: other (positions)'); }
      if (Math.abs(Math.hypot(q.cmd.x, q.cmd.y) - Math.hypot(p.cmd.x, p.cmd.y)) > 1.5) ch.add('command speed jump'); }
    if (w.length < 2) ch.add('left/entered the block');
    const k = ch.size ? [...ch].sort().join(' + ') : 'none (steady inputs)'; k2[k] = (k2[k] ?? 0) + 1;
    if ((k.includes('command speed jump') || k.startsWith('none')) && shown++ < 5) { console.log('  ' + k + ' ' + e.who.slot + ' t ' + e.t.toFixed(2));
      for (const q of w) console.log(`    ${q.t.toFixed(2)} ${q.label} cmd(${q.cmd.x.toFixed(1)},${q.cmd.y.toFixed(1)}) need ${q.need.toFixed(1)} req(${q.req.x.toFixed(1)},${q.req.y.toFixed(1)}) out(${q.out.x.toFixed(1)},${q.out.y.toFixed(1)}) tx ${q.tx.toFixed(1)} ty ${q.ty.toFixed(1)} pos(${q.pos.x.toFixed(1)},${q.pos.y.toFixed(1)}) vel(${q.vel.x.toFixed(1)},${q.vel.y.toFixed(1)}) rcv(${q.recv.x.toFixed(1)},${q.recv.y.toFixed(1)}) rv(${q.rv.x.toFixed(1)},${q.rv.y.toFixed(1)})`); } }
  console.log('deep-open-carry reversals by what changed:', JSON.stringify(Object.entries(k2).sort((a, b) => b[1] - a[1]))); }
console.log('speed sequences (+ override, - original):'); for (const s of sps) console.log('  ', s.join(' '));
