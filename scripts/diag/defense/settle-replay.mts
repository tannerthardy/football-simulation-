// The underneath zone-settle defender, request against body (Tools, 2026-11-16, Integration's isolated-body check on decel-census.mts's largest group). Staged as decel-census.mts (every pass concept but screens against the zone
// calls, two formations, seeds, both flips; zone defenders 2-9 yd off at the snap, throws at 1.0 s or later; run with ZONE_HOLD=18 CURL_SINK=1 SETTLE_DEPTH=1). Settlers: label 'zone-settle' at -0.5 s and at the throw. Over the half second
// before the throw, per tick, for each settler: the behaviour's returned request (MoveCommand.vel), the intent the world received (after every post-behaviour stage), his velocity, his facing, his shoulders;
// and the same body from its state at -0.5 s stepped alone with stepBody under the recorded intents (the isolated body) and, separately, under the behaviour's raw requests. Reports p50 over settlers at -0.5 / -0.25 / 0 s: request speed, intent
// speed, achieved speed (play and replayed), the request's angle off his facing and off his velocity, the request's tick-to-tick direction change (reversal rate: share of ticks that turn it more than 20 deg) and magnitude change.
//   ZONE_HOLD=18 CURL_SINK=1 SETTLE_DEPTH=1 node --import tsx scripts/diag/defense/settle-replay.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { stepBody } = await import(`${W}/src/physics/kinematics.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)]! : NaN; };
const ang = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
const sp = (v: any) => Math.hypot(v.x, v.y), hd = (v: any) => Math.atan2(v.y, v.x);
const S: Record<string, number[][]> = {}; const push = (k: string, j: number, v: number) => { ((S[k] ??= [[], [], []])[j]!).push(v); };
const swing: number[] = [], accel: Array<[number, number]> = []; let n = 0, settlers = 0; const turn: number[] = [], dmag: number[] = []; let ticks = 0, rev = 0; const label = new Map<string, number>();
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover3_match', 'cover4', 'cover6', 'tampa2'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const dir = sim.attackDir(sim.offense[0].team); const raw = new Map<any, any>(); const hist: any[] = [];
        let snap: Map<any, number> | null = null, tThrow = -1;
        const wstep = sim.world.step.bind(sim.world);
        let cur: Map<any, any> | null = null;
        sim.world.step = (intents: any[], dt: number) => {
          cur = new Map(sim.defense.map((d: any) => { const b = d.body, it = intents[d.idx]; return [d, { b: { ...b, pos: { ...b.pos }, vel: { ...b.vel }, support: b.support ? { ...b.support } : undefined }, it: it ? { ...it, vel: { ...it.vel } } : null, raw: raw.get(d) ? { vel: { ...raw.get(d).vel }, facing: raw.get(d).facing } : null, label: `${d.behavior?.constructor?.name ?? '-'}:${(raw.get(d) && facingTechnique(raw.get(d))?.label) ?? '-'}` }]; }));
          return wstep(intents, dt);
        };
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          if (!snap) snap = new Map(sim.defense.map((d: any) => [d, (d.pos.x - sim.los) * dir]));
          for (const d of sim.defense) { const b = d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...a: any[]) => { const r = u(...a); raw.set(d, r); return r; }; b.__h = 1; } }
          tick();
          if (tThrow >= 0) return;
          if (cur) hist.push({ t: sim.t, rows: cur, face: new Map(sim.defense.map((d: any) => [d, d.facing])), tech: new Map(sim.defense.map((d: any) => [d, d.technique ?? null])) });
          while (hist.length && sim.t - hist[0].t > 0.7) hist.shift();
          if (sim.ball.kind === 'air') {
            tThrow = sim.t; if (tThrow < 1.0) return;
            const i1 = hist.length - 1, i0 = hist.findIndex((h) => h.t >= tThrow - 0.5 - 1e-6); if (i0 < 0 || i1 - i0 < 8) return;
            for (const d of sim.defense) {
              const s0 = snap!.get(d) ?? 0; if (s0 < 2 || s0 >= 9 || /^(DE|DT|NT)/.test(d.slot)) continue;
              if (!/Zone|CoverageDefender/.test(d.behavior?.constructor?.name ?? '')) continue;
              n++;
              const lab0 = hist[i0].rows.get(d)?.label ?? '', lab1 = hist[i1].rows.get(d)?.label ?? '';
              label.set(`${lab0} -> ${lab1}`, (label.get(`${lab0} -> ${lab1}`) ?? 0) + 1);
              if (!/zone-settle/.test(lab0) || !/zone-settle/.test(lab1)) continue;
              settlers++;
              if (process.env.DUMP && settlers % 40 === 1) { console.log(`-- settler ${settlers} ${coverage} ${concept} ${d.slot}: tick, request speed/heading, body speed/heading, facing`); for (let i = i0; i <= i1; i += 2) { const r = hist[i].rows.get(d); if (r?.it) console.log(`   t-${(tThrow - hist[i].t).toFixed(2)}  req ${sp(r.it.vel).toFixed(2)} @ ${(hd(r.it.vel) * 180 / Math.PI).toFixed(0)}  body ${sp(r.b.vel).toFixed(2)} @ ${(hd(r.b.vel) * 180 / Math.PI).toFixed(0)}  facing ${(r.b.facing * 180 / Math.PI).toFixed(0)}`); } }
              const start = hist[i0].rows.get(d); if (!start?.it) continue;
              const clone = { ...start.b, pos: { ...start.b.pos }, vel: { ...start.b.vel }, support: start.b.support ? { ...start.b.support } : undefined };
              const clone2 = { ...start.b, pos: { ...start.b.pos }, vel: { ...start.b.vel }, support: start.b.support ? { ...start.b.support } : undefined };
              const aloneIntent: number[] = [], aloneRaw: number[] = [];
              for (let i = i0; i <= i1; i++) {
                const r = hist[i].rows.get(d); if (!r?.it) continue;
                stepBody(clone, r.it, sim.dt); aloneIntent.push(sp(clone.vel));
                if (r.raw) { stepBody(clone2, { ...r.it, vel: r.raw.vel, facing: r.raw.facing ?? r.it.facing }, sim.dt); aloneRaw.push(sp(clone2.vel)); }
              }
              let mx = 0; const hs: number[] = []; for (let i = i0; i <= i1; i++) { const it = hist[i].rows.get(d)?.it; if (it && sp(it.vel) >= 0.5) hs.push(hd(it.vel)); }
              for (let a = 0; a < hs.length; a++) for (let c = a + 1; c < hs.length; c++) mx = Math.max(mx, ang(hs[a]!, hs[c]!));
              swing.push(mx); accel.push([mx, sp(hist[i1].rows.get(d).b.vel) - sp(hist[i0].rows.get(d).b.vel)]);
              const idx = [i0, i0 + Math.floor((i1 - i0) / 2), i1];
              idx.forEach((i, j) => {
                const r = hist[i].rows.get(d); if (!r?.it) return;
                const b = r.b, face = r.b.facing;
                push('behaviour request speed', j, r.raw ? sp(r.raw.vel) : NaN); push('intent speed (what the world got)', j, sp(r.it.vel));
                push('achieved speed, in play', j, sp(b.vel)); push('achieved speed, alone under the intents', j, aloneIntent[i - i0] ?? NaN); push('achieved speed, alone under the raw requests', j, aloneRaw[i - i0] ?? NaN);
                push('intent angle off his facing (deg)', j, ang(hd(r.it.vel), face)); push('intent angle off his velocity (deg)', j, sp(b.vel) > 0.3 ? ang(hd(r.it.vel), hd(b.vel)) : NaN);
                push('intent facing off his facing (deg)', j, r.it.facing !== undefined ? ang(r.it.facing, face) : NaN);
                if (r.raw) push('behaviour request angle off the intent (deg)', j, ang(hd(r.raw.vel), hd(r.it.vel)));
              });
              for (let i = i0 + 1; i <= i1; i++) { const a = hist[i - 1].rows.get(d)?.it, c = hist[i].rows.get(d)?.it; if (!a || !c || sp(a.vel) < 0.5 || sp(c.vel) < 0.5) continue; ticks++; const t = ang(hd(a.vel), hd(c.vel)); turn.push(t); if (t > 20) rev++; dmag.push(Math.abs(sp(c.vel) - sp(a.vel))); }
            }
          }
        };
        sim.run();
      }
console.log(`zone defenders 2-9 yd off, throws at 1.0 s or later: ${n}; settlers (zone-settle at -0.5 s and at the throw): ${settlers} (${(settlers / n).toFixed(2)})`);
for (const [k, v] of [...label].sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`   ${k.padEnd(40)} ${(v / n).toFixed(2)}`);
console.log('settlers, p50 at -0.5 s / -0.25 s / the throw:');
for (const k of Object.keys(S)) console.log(`  ${k.padEnd(48)} ${S[k]!.map((v) => q(v).toFixed(2).padStart(6)).join(' ')}   n ${S[k]!.map((v) => String(v.filter(Number.isFinite).length)).join(' ')}`);
console.log(`the intent's tick-to-tick change over the last 0.5 s (ticks with speed >= 0.5 yd/s both ticks: ${ticks}): direction p50 ${q(turn).toFixed(1)} deg, share over 20 deg ${(rev / Math.max(1, ticks)).toFixed(3)}, speed change p50 ${q(dmag).toFixed(2)} yd/s`);
const sw = (f: (m: number) => boolean) => accel.filter(([m]) => f(m));
console.log(`the request's largest heading difference between any two ticks of the last 0.5 s, per settler: p50 ${q(swing).toFixed(0)} deg; share >= 90 deg ${(swing.filter((m) => m >= 90).length / swing.length).toFixed(2)}, >= 45 deg ${(swing.filter((m) => m >= 45).length / swing.length).toFixed(2)}`);
for (const [lab, f] of [['swing < 45 deg', (m: number) => m < 45], ['45 to 90 deg', (m: number) => m >= 45 && m < 90], ['>= 90 deg (a reversal)', (m: number) => m >= 90]] as const) { const R = sw(f); console.log(`  ${lab.padEnd(24)} n ${String(R.length).padStart(3)} | speed change over the half second (achieved) p50 ${q(R.map((r) => r[1])).toFixed(2)} yd/s`); }
