// node --import tsx scripts/diag/coverage/cross-pairs.mts [seeds] out.jsonl
// Per-play crosser throws (slide-control's set) as JSONL: play key, route, comp, yards, YAC; the underneath defender
// nearest the catch point at the release: slot, job|technique; his offset from the target at the release (along the
// target's lateral travel: + ahead of him; depth: + deeper than him) and his distance at the arrival.
// usage: [flags] node --import tsx out/cross-pairs.mts seeds out.jsonl
import { writeFileSync } from 'node:fs';
const W = process.cwd(), seeds = Number(process.argv[2] ?? 2), outp = process.argv[3];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const out: string[] = [];
for (const concept of ['mesh', 'drive', 'y_cross', 'hitch_cross', 'post_cross']) for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9'])
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const last = new Map<any, string>();
    for (const d of sim.defense) { const b = d.behavior; if (!b?.update) continue; const u = b.update.bind(b);
      b.update = (a: any, s: any) => { const cmd = u(a, s); last.set(d, `${(b as any).job ?? b.constructor.name}|${facingTechnique(cmd)?.label ?? (b as any).sub?.constructor?.name ?? '-'}|${((b as any).sub?.target ?? (b as any).target)?.slot ?? '-'}`); return cmd; }; }
    let T: any = null, route = '?', at: any = null, aim: any = null, arr: any = null;
    const tick = sim.tick.bind(sim); sim.tick = () => { tick(); if (at && !arr && sim.t >= sim.ball.arrivalT) arr = new Map([...sim.defense, ...sim.offense].map((p: any) => [p, { x: p.pos.x, y: p.pos.y }])); };
    const tb = sim.throwBall.bind(sim); sim.throwBall = (p: any, target: any, v0: any, intended: any, ...r: any[]) => { if (p === sim.qb && !T && target) { T = target; aim = intended; route = target.behavior?.route?.id ?? target.behavior?.fallback?.route?.id ?? '?';
      at = { jobs: new Map(last), pos: new Map([...sim.defense, ...sim.offense].map((q: any) => [q, { x: q.pos.x, y: q.pos.y, vx: q.vel.x, vy: q.vel.y }])) }; } return tb(p, target, v0, intended, ...r); };
    let res: any; try { res = sim.run(); } catch { continue; }
    if (!T || !/cross|shallow|mesh|drag|under/.test(route)) continue;
    const up = sim.attackDir('O');
    let best: any = null, bd = 1e9;
    for (const d of sim.defense) { const p = at.pos.get(d); const dd = (p.x - sim.los) * up; if (dd < 0 || dd > 14 || !/LB|CB|S|DB|NB/.test(d.player.position)) continue; const k = Math.hypot(p.x - aim.x, p.y - aim.y); if (k < bd) { bd = k; best = d; } }
    const t = at.pos.get(T), b = best ? at.pos.get(best) : null; const dir = Math.sign(t.vy) || 1;
    const ta = arr?.get(T), ba = best && arr ? arr.get(best) : null;
    out.push(JSON.stringify({ key: `${concept}|${coverage}|${formation}|${seed}|${flip}`, route, tgt: T.slot, comp: !!res.stats.completed, yds: res.yards ?? 0, yac: res.stats.yac ?? null,
      airDepth: +((aim.x - sim.los) * up).toFixed(1), def: best?.slot ?? null, job: best ? at.jobs.get(best) ?? '?' : null,
      ahead: b ? +((b.y - t.y) * dir).toFixed(1) : null, deeper: b ? +((b.x - t.x) * up).toFixed(1) : null, dvy: b ? +((b.vy - t.vy) * dir).toFixed(1) : null,
      dArr: ta && ba ? +Math.hypot(ta.x - ba.x, ta.y - ba.y).toFixed(1) : null }));
  }
writeFileSync(outp, out.join('\n') + '\n'); console.log(out.length, 'crosser throws ->', outp);
