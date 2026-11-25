// The man at the catch point (Coverage C14, 2026-11-25; Integration's near-band item): on staged quick and curl throws,
// the coverer within 2.5 yd of the target when the ball arrives. What did he ask of his body over the last 0.5 s before
// the arrival, and what did his body do? Each velocity is split into a component toward the catch point (the target's
// position at the arrival, the auditor's view) and a component along the target's own run. Reads only.
// Per throw (JSONL): concept, coverage, the coverer's behaviour and technique label, his tags, separation at the
// arrival, closing on the target at the arrival (his velocity toward the target, the catch-start operator) and, at
// -0.5 / -0.3 / -0.1 / 0 s, requested and achieved {toCatch, alongRun, speed}.
//   [env] node --import tsx scripts/diag/coverage/catch-point-stage.mts SEEDS out.jsonl [concepts] [coverages]
//   node --import tsx scripts/diag/coverage/catch-point-stage.mts --report a.jsonl [b.jsonl]
import { appendFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const q = (v: (number | undefined | null)[], d = 1) => { const w = v.filter((x): x is number => Number.isFinite(x as number)).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map((f) => w[Math.floor(f * (w.length - 1))].toFixed(d)).join('/') : '-'; };
const MAN = new Set(['cover0', 'cover1', 'cover1_off', 'cover2_man']);

if (process.argv[2] === '--report') {
  for (const f of process.argv.slice(3)) {
    const R = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    console.log(`== ${f}: throws with a coverer within 2.5 yd at the arrival: ${R.length}`);
    for (const fam of ['man', 'zone']) {
      const V = R.filter((r) => (MAN.has(r.coverage) ? 'man' : 'zone') === fam); if (!V.length) continue;
      console.log(` ${fam} (n ${V.length}): separation ${q(V.map((r) => r.sep))} yd, closing on the target at the arrival ${q(V.map((r) => r.closing))} yd/s, caught ${V.filter((r) => r.caught).length}`);
      for (const k of ['-0.5', '-0.3', '-0.1', '0']) {
        const at = V.map((r) => r.at[k]).filter(Boolean);
        console.log(`          cap at the asked heading ${q(at.map((a: any) => a.cap))}  effort ${q(at.map((a: any) => a.effort), 2)}  hips off the asked heading ${q(at.map((a: any) => a.hipOff), 0)} deg  asked facing off it ${q(at.map((a: any) => a.reqFacing), 0)} deg`);
        console.log(`   ${k.padStart(4)} s  asked: toCatch ${q(at.map((a: any) => a.req.toCatch)).padEnd(15)} alongRun ${q(at.map((a: any) => a.req.alongRun)).padEnd(15)} speed ${q(at.map((a: any) => a.req.speed)).padEnd(13)} | did: toCatch ${q(at.map((a: any) => a.ach.toCatch)).padEnd(15)} alongRun ${q(at.map((a: any) => a.ach.alongRun)).padEnd(15)} speed ${q(at.map((a: any) => a.ach.speed))}`);
      }
      const by = new Map<string, any[]>(); for (const r of V) { const k = `${r.kind}:${r.label ?? '-'}`; if (!by.has(k)) by.set(k, []); by.get(k)!.push(r); }
      for (const [k, X] of [...by].sort((a, b) => b[1].length - a[1].length).slice(0, 8))
        console.log(`     ${String(X.length).padStart(3)} ${k.slice(0, 44).padEnd(44)} asked toCatch@-0.1 ${q(X.map((r) => r.at['-0.1']?.req.toCatch)).padEnd(15)} closing@arrival ${q(X.map((r) => r.closing))}`);
    }
  }
  process.exit(0);
}

const seeds = Number(process.argv[2] ?? 8), out = process.argv[3] ?? 'out/diag/coverage/catch-point-stage.jsonl';
const CONCEPTS = (process.argv[4] ?? 'hitches,curl_flat,stick,hitch_out').split(',');
const COVS = (process.argv[5] ?? 'cover1,cover0,cover3,cover2,cover4').split(',');
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, '');
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { effectiveVmax } = await import(`${W}/src/physics/kinematics.ts`);
const { releaseBelief } = await import(`${W}/src/sim/release-belief.ts`);
const angd = (x: number) => { let v = x; while (v > Math.PI) v -= 2 * Math.PI; while (v < -Math.PI) v += 2 * Math.PI; return Math.abs(v) * 180 / Math.PI; };
const split = (v: { x: number; y: number }, from: { x: number; y: number }, to: { x: number; y: number }, run: { x: number; y: number }) => {
  const dx = to.x - from.x, dy = to.y - from.y, l = Math.hypot(dx, dy) || 1, rl = Math.hypot(run.x, run.y);
  return { toCatch: +((v.x * dx + v.y * dy) / l).toFixed(2), alongRun: rl > 0.5 ? +((v.x * run.x + v.y * run.y) / rl).toFixed(2) : null, speed: +Math.hypot(v.x, v.y).toFixed(2) };
};
let n = 0;
for (const concept of CONCEPTS) for (const coverage of COVS) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }));
  const hist = new Map<number, { t: number; pos: any; vel: any; req: any; kind: string; label?: string; tags: string }[]>();
  const decide = sim.decide.bind(sim);
  sim.decide = (i: number, t: number) => {
    const a = sim.agents[i];
    if (a.team === 'D' && a.behavior && !a.behavior.__cpw) {
      const b = a.behavior, u = b.update.bind(b);
      b.update = (ag: any, s: any) => { const c = u(ag, s); ag.__cmd = c; return c; }; b.__cpw = true;
    }
    decide(i, t);
  };
  let arrived: any = null, wasAir = false, caught = false, lastBall: any = null, relT: number | undefined;
  const tagFirst = new Map<number, Record<string, number>>(), atRel = new Map<number, any>();
  const ev0 = sim.event.bind(sim);
  sim.event = (type: string, a?: any, b?: any, note?: string) => { if (type === 'catch' && a?.team === 'O') caught = true; return ev0(type, a, b, note); };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const air = sim.ball.kind === 'air';
    if (air) lastBall = { ...sim.ball.flight.pos };
    if (air && relT === undefined) { relT = sim.t; for (const d of sim.defense) atRel.set(d.idx, { pos: { ...d.pos }, vel: { ...d.vel }, zone: d.behavior?.zone, kind: d.behavior?.kind, tags: [...(d.tags ?? [])].join(',') }); }
    if (relT !== undefined && !arrived) for (const d of sim.defense) { const m = tagFirst.get(d.idx) ?? {}; for (const tg of d.tags ?? []) if (m[tg] === undefined) m[tg] = +(sim.t - relT).toFixed(2); tagFirst.set(d.idx, m); }
    if (air) for (const d of sim.defense) {
      const h: any[] = hist.get(d.idx) ?? []; const c = d.__cmd;
      const rh = c?.vel && Math.hypot(c.vel.x, c.vel.y) > 0.3 ? Math.atan2(c.vel.y, c.vel.x) : undefined;
      h.push({ t: sim.t, pos: { ...d.pos }, vel: { ...d.vel }, req: c?.vel ? { ...c.vel } : null, effort: c?.effort ?? 1, hipOff: rh === undefined ? null : +angd(rh - (d.body?.facing ?? d.facing)).toFixed(0), cap: rh === undefined ? null : +effectiveVmax(d.body, rh, c?.effort ?? 1).toFixed(2), reqFacing: c?.facing === undefined || rh === undefined ? null : +angd(c.facing - rh).toFixed(0), kind: d.behavior?.kind ?? '?', label: c ? facingTechnique(c)?.label : undefined, tags: [...(d.tags ?? [])].filter((x: string) => x !== 'looking').join(',') });
      while (h.length && sim.t - h[0].t > 0.65) h.shift(); hist.set(d.idx, h);
    }
    if (wasAir && !air && !arrived) {
      const b = lastBall;
      const target = [...sim.offense].sort((x: any, y: any) => Math.hypot(x.pos.x - b.x, x.pos.y - b.y) - Math.hypot(y.pos.x - b.x, y.pos.y - b.y))[0];
      const cov = [...sim.defense].sort((x: any, y: any) => Math.hypot(x.pos.x - target.pos.x, x.pos.y - target.pos.y) - Math.hypot(y.pos.x - target.pos.x, y.pos.y - target.pos.y))[0];
      const ddx = target.pos.x - cov.pos.x, ddy = target.pos.y - cov.pos.y, dl = Math.hypot(ddx, ddy) || 1;
      const rb = releaseBelief(sim, cov);
      arrived = { t: sim.t, rb: { src: rb.source ?? null, rel: rb.releasedAt === undefined ? null : +(rb.releasedAt - (relT ?? 0)).toFixed(2), ball: rb.ballAt === undefined ? null : +(rb.ballAt - (relT ?? 0)).toFixed(2) }, target, cov, catchPt: { ...target.pos }, run: { ...target.vel }, closing: (cov.vel.x * ddx + cov.vel.y * ddy) / dl, sep: dl };
    }
    wasAir = air;
  };
  sim.run();
  if (!arrived) continue;
  const { cov, catchPt, run } = arrived, sep = arrived.sep;
  if (sep > 2.5) continue;
  const h = hist.get(cov.idx) ?? [], at: any = {};
  for (const k of [0.5, 0.3, 0.1, 0]) {
    const s = h.reduce((best: any, x) => (!best || Math.abs(arrived.t - k - x.t) < Math.abs(arrived.t - k - best.t) ? x : best), null);
    if (!s || Math.abs(arrived.t - k - s.t) > 0.06) continue;
    at[k === 0 ? '0' : `-${k}`] = { req: s.req ? split(s.req, s.pos, catchPt, run) : null, ach: split(s.vel, s.pos, catchPt, run), effort: s.effort, hipOff: s.hipOff, cap: s.cap, reqFacing: s.reqFacing, label: s.label, tags: s.tags };
  }
  const last = h[h.length - 1];
  const r0 = atRel.get(cov.idx);
  const rel = r0 ? { zone: r0.zone ?? null, kind: r0.kind, distToCatch: +Math.hypot(r0.pos.x - catchPt.x, r0.pos.y - catchPt.y).toFixed(2), speed: +Math.hypot(r0.vel.x, r0.vel.y).toFixed(2), toCatch: split(r0.vel, r0.pos, catchPt, run).toCatch, tags: r0.tags } : null;
  appendFileSync(out, JSON.stringify({ concept, coverage, seed, flip, caught, flight: +(arrived.t - (relT ?? arrived.t)).toFixed(2), zone: cov.behavior?.zone ?? null, rb: arrived.rb, rel, tagFirst: tagFirst.get(cov.idx) ?? {}, sep: +sep.toFixed(2), closing: +arrived.closing.toFixed(2), kind: last?.kind, label: last?.label, tags: last?.tags, at }) + '\n');
  n++;
}
console.log(`wrote ${n} throws to ${out}`);
