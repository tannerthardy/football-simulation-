// The zone first arriver's execution, replayed (Tools, 2026-11-16, for Integration's check after cue_onset.py / closer-census.mts). Staged as closer-census.mts: every pass concept but screens against the zone calls, two formations,
// both flips; completions caught 0-12 yd by the thrown-to receiver; the first arriver is the defender nearest the target at the catch, underneath (2-9 yd off at the snap). His onset is cue_onset.py's: the start of his last run
// of closing on the target (his velocity along the line to the target, the +/-0.2 s central difference on a 10 Hz sample) above +0.5 yd/s that lasts to the throw. From the body's state just before the onset tick, the same body
// is stepped alone with stepBody under the intents the play gave him over the next 0.8 s; what differs from the play is the world (the solver, contacts, the trunk), not the request. Reported, p50 by time since onset (0 to 0.8 s):
// his closing and speed in play and alone, the request's speed and closing (the intent), his facing off the line to the target (deg), the support state. usage: node --import tsx scripts/diag/defense/closer-replay.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 1);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { stepBody } = await import(`${W}/src/physics/kinematics.ts`);
const q = (v: number[], p = 0.5) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(p * (a.length - 1))]! : NaN; };
const J = 9; const S: Record<string, number[][]> = {}; const push = (k: string, j: number, v: number) => { ((S[k] ??= Array.from({ length: J }, () => []))[j]!).push(v); };
let plays = 0, closers = 0;
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover3_match', 'cover4', 'cover6', 'tampa2'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const dir = sim.attackDir(sim.offense[0].team); plays++;
        const snaps: any[] = []; let tThrow = -1, thr: any = null, C: any = null, snapDepth: Map<any, number> | null = null;
        let lastIntents: any[] = [];
        const wstep = sim.world.step.bind(sim.world);
        sim.world.step = (intents: any[], dt: number) => {
          const row = new Map<any, any>();
          for (const d of sim.defense) { const b = d.body, it = intents[d.idx]; row.set(d, { b: { ...b, pos: { ...b.pos }, vel: { ...b.vel }, support: b.support ? { ...b.support } : undefined }, it: it ? { ...it, vel: { ...it.vel } } : null, pos: { ...d.pos }, tp: null }); }
          const tp = new Map<any, any>(sim.offense.map((o: any) => [o, { ...o.pos }]));
          snaps.push({ t: sim.t, row, tp, qb: { ...sim.qb.pos } }); lastIntents = intents;
          return wstep(intents, dt);
        };
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          if (!snapDepth) snapDepth = new Map(sim.defense.map((d: any) => [d, (d.pos.x - sim.los) * dir]));
          tick();
          if (tThrow < 0 && sim.ball.kind === 'air') { tThrow = sim.t; thr = sim.ball.target; }
          if (thr && !C && sim.catchAt >= 0 && sim.ball.kind === 'held') {
            C = sim.ball.carrier; const depth = (C.pos.x - sim.los) * dir;
            if (C !== thr || depth < 0 || depth > 12) { C = 'skip'; return; }
            const first = sim.defense.reduce((b: any, d: any) => (!b || Math.hypot(d.pos.x - C.pos.x, d.pos.y - C.pos.y) < Math.hypot(b.pos.x - C.pos.x, b.pos.y - C.pos.y) ? d : b), null);
            const d0 = snapDepth.get(first) ?? 0; if (d0 < 2 || d0 >= 9) return;
            // 10 Hz sample of positions (every second tick), the operator's closing on the target.
            const idx: number[] = []; for (let i = 0; i < snaps.length; i += 2) idx.push(i);
            const pos = (k: number) => snaps[idx[k]!]?.row.get(first).pos, tpos = (k: number) => snaps[idx[k]!]?.tp.get(thr);
            const vel = (k: number) => { const a = pos(k - 2), b = pos(k + 2); return a && b ? { x: (b.x - a.x) / 0.4, y: (b.y - a.y) / 0.4 } : null; };
            const clo = (k: number) => { const v = vel(k), p = pos(k), t = tpos(k); if (!v || !p || !t) return null; const L = Math.hypot(t.x - p.x, t.y - p.y) || 1; return (v.x * (t.x - p.x) + v.y * (t.y - p.y)) / L; };
            const kt = idx.findIndex((i) => snaps[i]!.t >= tThrow - 1e-6); if (kt < 4) return;
            if ((clo(kt) ?? 0) <= 0.5) return;
            let k = kt; while (k > 2 && (clo(k - 1) ?? 0) > 0.5) k--;
            const i0 = idx[k]!; if (i0 + 16 >= snaps.length || kt - k < 0) return;
            closers++;
            const clone = { ...snaps[i0]!.row.get(first).b, pos: { ...snaps[i0]!.row.get(first).b.pos }, vel: { ...snaps[i0]!.row.get(first).b.vel }, support: snaps[i0]!.row.get(first).b.support ? { ...snaps[i0]!.row.get(first).b.support } : undefined };
            const alone: { pos: any }[] = [{ pos: { ...clone.pos } }];
            for (let s = 1; s <= 16; s++) { const it = snaps[i0 + s - 1]!.row.get(first).it; if (it && !it.free) stepBody(clone, it, sim.dt); alone.push({ pos: { ...clone.pos } }); }
            // alone closing/speed from the same 10 Hz central difference (needs positions from -0.2 s: the play's before the onset, the replay's after).
            const aloneAt = (j: number) => { const a = j - 2 >= 0 ? alone[2 * (j - 2)]!.pos : pos(k + j - 2), b = alone[2 * (j + 2)]?.pos; return a && b ? { x: (b.x - a.x) / 0.4, y: (b.y - a.y) / 0.4 } : null; };
            for (let j = 0; j < J; j++) {
              const kk = k + j; if (kk > kt + 2) break;
              const v = vel(kk), p = pos(kk), t = tpos(kk); if (!v || !p || !t) continue;
              const L = Math.hypot(t.x - p.x, t.y - p.y) || 1, ux = (t.x - p.x) / L, uy = (t.y - p.y) / L;
              push('inplay closing', j, clo(kk)!); push('inplay speed', j, Math.hypot(v.x, v.y));
              const av = j + 2 <= 8 ? aloneAt(j) : null; if (av) { push('alone closing', j, av.x * ux + av.y * uy); push('alone speed', j, Math.hypot(av.x, av.y)); }
              const row = snaps[idx[kk]!]!.row.get(first), it = row.it;
              if (it) { push('requested speed', j, Math.hypot(it.vel.x, it.vel.y)); push('requested closing', j, it.vel.x * ux + it.vel.y * uy); }
              const fa = Math.abs(((row.b.facing - Math.atan2(uy, ux)) * 180 / Math.PI + 540) % 360 - 180); push('facing off the target line (deg)', j, fa);
              push('not up (support)', j, row.b.support && row.b.support.state !== 'up' ? 1 : 0);
            }
          }
        };
        sim.run();
      }
console.log(`${plays} staged zone plays, ${closers} underneath closers (an onset found, at least 0.8 s of replay), seeds ${seeds}`);
for (const key of ['inplay closing', 'alone closing', 'requested closing', 'inplay speed', 'alone speed', 'requested speed', 'facing off the target line (deg)', 'not up (support)'])
  console.log(`  ${key.padEnd(34)} p50 by time since onset 0.0..0.8 s: ` + (S[key] ?? []).map((v) => q(v).toFixed(2).padStart(5)).join(' ') + '   n ' + (S[key] ?? []).map((v) => String(v.length).padStart(4)).join(' '));
