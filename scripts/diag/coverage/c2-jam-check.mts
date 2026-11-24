// C2_JAM staged check: every non-screen concept x Cover 2 family calls x seeds x flip (gun doubles), one arm per process
// (flags read at import). Per side: the flat corner's alignment (depth off the line, width outside #1) at the snap; whether
// a jam joint was on #1 (World hands joint between the two) and for how long, and #1's depth when it ended; #1's lateral
// move from the snap to 5 yd (+ outside, - inside: release side); #1's time to 10 yd; the corner's depth at 3.0 s.
// Read-only.   [SQUAT_SINK=1 C2_JAM=1] ARM=x node --import tsx scripts/diag/coverage/c2-jam-check.mts [seeds]
const W = process.cwd();
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const seeds = Number(process.argv[2] ?? 3);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && !c.screen).map(([id]) => id);
const COVS = (process.argv[3] ?? 'cover2,cover2_match,tampa2,cover6').split(',');
const rows: any[] = []; let n = 0, inc = 0, yds = 0;
for (const concept of concepts) for (const coverage of COVS) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
  let setup: any; try { setup = nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }); } catch { continue; }
  const sim: any = new PlaySim(setup); const tick = sim.tick.bind(sim);
  const sides: any[] = [];
  let init = false;
  sim.tick = () => { tick();
    if (!init) { init = true;
      for (const side of ['S', 'W'] as const) {
        const one = sim.offense.find((r: any) => r.slot === sim.offAlign.numbering[`${side}1`]);
        const cb = sim.defense.find((d: any) => (d.behavior as any)?.zone === (side === 'S' ? 'flat_s' : 'flat_w'));
        if (!one || !cb) continue;
        const out = Math.sign(one.pos.y - sim.ballY) || 1;
        sides.push({ one, cb, y0: one.pos.y, out, alignDepth: +(cb.pos.x - sim.los).toFixed(2), alignOutside: +((cb.pos.y - one.pos.y) * out).toFixed(2),
          jam: 0, jamStartDepth: null as number | null, jamEndDepth: null as number | null, lat5: null as number | null, t10: null as number | null, cb3: null as number | null, on: false });
      } }
    for (const s of sides) {
      const joined = sim.world.joints.some((j: any) => j.kind === 'hands' && ((j.a === s.cb.body && j.b === s.one.body) || (j.a === s.one.body && j.b === s.cb.body)));
      if (joined) { if (!s.on) s.jamStartDepth = +(s.one.pos.x - sim.los).toFixed(2); s.jam += sim.dt; } else if (s.on) s.jamEndDepth = +(s.one.pos.x - sim.los).toFixed(2);
      s.on = joined;
      const d = s.one.pos.x - sim.los;
      if (s.lat5 === null && d >= 5) s.lat5 = +((s.one.pos.y - s.y0) * s.out).toFixed(2);
      if (s.t10 === null && d >= 10) s.t10 = +sim.t.toFixed(2);
      if (s.cb3 === null && sim.t >= 3.0) s.cb3 = +(s.cb.pos.x - sim.los).toFixed(2);
    } };
  let r: any; try { r = sim.run(); } catch { continue; }
  n++; if (r.outcome === 'incomplete') inc++; yds += r.yards;
  for (const s of sides) rows.push({ concept, coverage, seed, flip, alignDepth: s.alignDepth, alignOutside: s.alignOutside, jam: +s.jam.toFixed(2),
    jamStartDepth: s.jamStartDepth, jamEndDepth: s.jamEndDepth, lat5: s.lat5, t10: s.t10, cb3: s.cb3, outcome: r.outcome, yards: r.yards });
}
const q = (v: any[], p: number) => { const s = v.filter((x) => x !== null && x !== undefined).sort((a, b) => a - b); return s.length ? +s[Math.floor(p * (s.length - 1))].toFixed(2) : null; };
const jams = rows.filter((x) => x.jam > 0), withLat = rows.filter((x) => x.lat5 !== null);
console.log(JSON.stringify({ arm: process.env.ARM, plays: n, incomplete: inc, ydsPerPlay: +(yds / n).toFixed(2), sides: rows.length,
  align: { depth: [q(rows.map((x) => x.alignDepth), .1), q(rows.map((x) => x.alignDepth), .5), q(rows.map((x) => x.alignDepth), .9)], outside: q(rows.map((x) => x.alignOutside), .5) },
  jamRate: +(jams.length / rows.length).toFixed(3), jamSecs: [q(jams.map((x) => x.jam), .5), q(jams.map((x) => x.jam), .9)], jamStartDepth: q(jams.map((x) => x.jamStartDepth), .5), jamEndDepth: q(jams.map((x) => x.jamEndDepth), .5),
  insideAt5: +(withLat.filter((x) => x.lat5 < -0.5).length / withLat.length).toFixed(3), outsideAt5: +(withLat.filter((x) => x.lat5 > 0.5).length / withLat.length).toFixed(3),
  t10: [q(rows.map((x) => x.t10), .25), q(rows.map((x) => x.t10), .5), q(rows.map((x) => x.t10), .75)], cbDepth3: q(rows.map((x) => x.cb3), .5) }));
mkdirSync('out', { recursive: true }); writeFileSync(`out/c2-jam-${process.env.ARM}.jsonl`, rows.map((x) => JSON.stringify(x)).join('\n'));
