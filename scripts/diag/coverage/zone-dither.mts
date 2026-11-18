// node --import tsx scripts/diag/coverage/zone-dither.mts [seeds]
// Underneath zone men (LB/DB 0-12 yd deep at the release, controller kind zone), the 1.0 s before the release: technique
// label changes per second, lateral-request sign reversals per second (|v| > 1 yd/s each side), and body lateral
// reversals per second; plus which label pairs flip most. usage: [flags] node --import tsx out/zone-dither.mts seeds
const W = process.cwd(), seeds = Number(process.argv[2] ?? 1);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && c.family !== 'playaction').map(([id]) => id);
let men = 0, flips = 0, rqRev = 0, bodyRev = 0, tgCh = 0, fJump = 0; const pairs = new Map<string, number>(); const perMan: number[] = [];
for (const concept of concepts) for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip })); } catch { continue; }
    const log = new Map<any, any[]>();
    for (const d of sim.defense) { const b = d.behavior; if (!b?.update || b.kind !== 'zone') continue; const u = b.update.bind(b);
      b.update = (a: any, s: any) => { const c = u(a, s); (log.get(d) ?? log.set(d, []).get(d)!).push({ t: s.t, lab: facingTechnique(c)?.label ?? '', vy: c?.vel?.y ?? 0, by: a.vel.y, x: a.pos.x, tg: ((b as any).target ?? (b as any).sub?.target)?.idx ?? -1, fc: c?.facing }); return c; }; }
    let tT = -1; const tb = sim.throwBall.bind(sim); sim.throwBall = (p: any, ...r: any[]) => { if (p === sim.qb && tT < 0) tT = sim.t; return tb(p, ...r); };
    try { sim.run(); } catch { continue; }
    if (tT < 1.2) continue;
    const up = sim.attackDir('O');
    for (const [d, rows] of log) {
      const w = rows.filter((r: any) => r.t >= tT - 1.0 && r.t <= tT); if (w.length < 10) continue;
      const depth = (w[w.length - 1].x - sim.los) * up; if (depth < 0 || depth > 12) continue;
      men++; let f = 0;
      for (let i = 1; i < w.length; i++) {
        if (w[i].lab !== w[i - 1].lab) { f++; const k = `${w[i - 1].lab} -> ${w[i].lab}`; pairs.set(k, (pairs.get(k) ?? 0) + 1); }
      }
      const rev = (key: string) => { let s = 0, n = 0; for (const r of w) { const v = r[key]; if (Math.abs(v) > 1) { const sg = Math.sign(v); if (s && sg !== s) n++; s = sg; } } return n; };
      for (let i = 1; i < w.length; i++) { if (w[i].tg !== w[i - 1].tg) tgCh++; const f0 = w[i - 1].fc, f1 = w[i].fc; if (f0 !== undefined && f1 !== undefined && Math.abs(Math.atan2(Math.sin(f1 - f0), Math.cos(f1 - f0))) > Math.PI / 2) fJump++; }
      flips += f; rqRev += rev('vy'); bodyRev += rev('by'); perMan.push(f);
    }
  }
perMan.sort((a, b) => a - b);
console.log(`underneath zone men ${men} (1.0 s before the release): technique changes/s ${(flips / men).toFixed(2)} (p50 ${perMan[perMan.length >> 1]}, p90 ${perMan[Math.floor(perMan.length * 0.9)]}), lateral request reversals/s ${(rqRev / men).toFixed(2)}, body lateral reversals/s ${(bodyRev / men).toFixed(2)}, picked-receiver changes/s ${(tgCh / men).toFixed(2)}, facing-target jumps > 90 deg/s ${(fJump / men).toFixed(2)}`);
for (const [k, n] of [...pairs].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`  ${String(n).padStart(4)}  ${k}`);
