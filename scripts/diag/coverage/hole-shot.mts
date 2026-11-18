// Sim side of hole_shot.py: staged dropbacks against Cover 2 / Match / Tampa; throws to the target side's #1 (widest at
// the snap) at least 15 yd past the line. Same row: the corner (CB on the target's side) and that side's half safety,
// contact at the release (closest approach in the first 1.0 s), reroute at 1.0 s, the corner under #1 at the throw,
// flight, distances at the ball's arrival, caught, yards, YAC, and who tackled.
//   node --import tsx scripts/diag/coverage/hole-shot.mts [seeds] [out.jsonl]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const outPath = process.argv[3] ?? 'out/diag/coverage/hole-sim.jsonl';
const label = process.env.LABEL ?? 'sim';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && c.family !== 'playaction' && c.drop !== 'pa').map(([id]) => id);
const lines: string[] = [];
const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
for (const concept of concepts) for (const coverage of ['cover2', 'cover2_match', 'tampa2']) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const snap = new Map<any, any>(); const hist = new Map<any, any[]>();
    let thr: any = null, arr: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (!snap.size) for (const p of [...sim.offense, ...sim.defense]) snap.set(p, { x: p.pos.x, y: p.pos.y });
      if (sim.t <= 1.05) for (const p of [...sim.offense, ...sim.defense]) { if (!hist.has(p)) hist.set(p, []); hist.get(p)!.push({ x: p.pos.x, y: p.pos.y }); }
      if (sim.throwAt >= 0 && !thr) thr = { t: sim.t, at: new Map([...sim.offense, ...sim.defense].map((p: any) => [p, { x: p.pos.x, y: p.pos.y }])), aim: sim.ball.intended, arrT: sim.ball.arrivalT };
      if (thr && !arr && sim.t >= thr.arrT) arr = new Map([...sim.offense, ...sim.defense].map((p: any) => [p, { x: p.pos.x, y: p.pos.y }]));
    };
    const res = sim.run();
    const s = res.stats;
    if (!s.attempted || !thr || !thr.aim || thr.aim.x - sim.los < 15) continue;
    const T = sim.offense.find((r: any) => r.player.id === s.target);
    if (!T) continue;
    const side = Math.sign(snap.get(T).y - sim.ballY) || 1;
    const mine = sim.offense.filter((r: any) => r.slot !== 'QB' && (snap.get(r).y - sim.ballY) * side > 0);
    const widest = mine.sort((a: any, b: any) => Math.abs(snap.get(b).y - sim.ballY) - Math.abs(snap.get(a).y - sim.ballY))[0];
    if (widest !== T) continue;
    const cb = sim.defense.find((d: any) => /^CB/.test(d.slot) && (snap.get(d).y - sim.ballY) * side > 0);
    const sf = sim.defense.find((d: any) => /deep_half/.test(d.behavior?.zone ?? '') && (snap.get(d).y - sim.ballY) * side > 0);
    if (!cb || !sf || !arr) continue;
    const ht = hist.get(T)!, hc = hist.get(cb)!;
    const jam = Math.min(...ht.map((p: any, i: number) => hc[i] ? dist(p, hc[i]) : 99));
    const tacklers = (s.tacklers ?? []).map((id: any) => sim.defense.find((d: any) => d.player.id === id)?.slot ?? '?');
    lines.push(JSON.stringify({ src: label, key: `${concept}|${coverage}|${formation}|${seed}|${flip ? 'F' : 'N'}`, jam, reroute: Math.abs(ht[ht.length - 1].y - ht[0].y),
      under: thr.at.get(T).x - thr.at.get(cb).x, flight: thr.arrT - thr.t, cbAtArr: dist(arr.get(cb), arr.get(T)), sAtArr: dist(arr.get(sf), arr.get(T)),
      caught: !!s.completed, int: !!s.interceptedBy, yards: res.yards, yac: s.completed ? res.yards - (thr.aim.x - sim.los) : null,
      tackler: tacklers.map((x: string) => /^CB/.test(x) ? 'CB' : /^(SS|FS|S)/.test(x) ? 'S' : x), air: thr.aim.x - sim.los }));
  }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n') + '\n');
console.log(lines.length, 'hole-shot throws');
