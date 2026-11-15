// CORNER_DROP play-action cost (Integration ask): staged PA shot concepts against the Cover 3 family, same seeds off/on.
// Per deep-third corner (zone at the snap deep_third_*): when he first reads run, what he does over the next 0.5 s
// (mean downfield velocity: sink > +0.5, squat within ±0.5, trigger < -0.5 yd/s) and his request label then; his depth
// relative to the deepest receiver on his side at 2.0 and 2.5 s; completions of 15+ yd caught on his side.
//   node --import tsx out/diag/cd/pa-corner.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 4);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const NON_REC = /^(QB|LT|LG|C|RG|RT|OL)/;
const rows: any[] = []; let plays = 0;
for (const concept of ['pa_post_dig', 'pa_shot', 'pa_flood'])
  for (const coverage of ['cover3', 'cover3_match', 'cover3_buzz', 'cover3_seam', 'cover3_cloud'])
    for (const formation of ['i_pro_21', 'ace_12', 'pistol_11', 'gun_doubles_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip }));
        plays++;
        let cbs: any[] | null = null, catchPos: any = null, los = 40, dir = 1, ballY = 0;
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          if (!cbs) {
            const qb = sim.offense.find((o: any) => o.slot === 'QB'); ballY = qb?.pos.y ?? 0; los = qb ? qb.pos.x : 40;
            const dc = sim.defense.reduce((s: number, d: any) => s + d.pos.x, 0) / sim.defense.length; dir = Math.sign(dc - los) || 1;
            cbs = sim.defense.filter((d: any) => d.slot.startsWith('CB') && /^deep_third_/.test(d.behavior?.zone ?? ''))
              .map((d: any) => ({ d, side: Math.sign(d.pos.y - ballY), row: { concept, coverage, formation, seed, flip, slot: d.slot, runAt: null, passAt: null, ticks: [] as any[] } }));
          }
          tick();
          for (const c of cbs) {
            const b = c.d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { const r = u(...q); c.req = r; return r; }; b.__h = 1; }
            const read = c.d.recog?.read ?? '-';
            if (c.row.runAt === null && read === 'run') c.row.runAt = sim.t;
            if (c.row.passAt === null && read === 'pass') c.row.passAt = sim.t;
            const recs = sim.offense.filter((o: any) => !NON_REC.test(o.slot) && Math.sign(o.pos.y - ballY) === c.side);
            const deepest = recs.length ? Math.max(...recs.map((o: any) => (o.pos.x - los) * dir)) : NaN;
            c.row.ticks.push({ t: sim.t, depth: (c.d.pos.x - los) * dir, vx: c.d.vel.x * dir, deepest, read, lab: facingTechnique(c.req ?? {})?.label ?? '-', air: sim.ball?.kind === 'air' });
          }
          if (!catchPos && sim.catchAt >= 0 && sim.ball?.kind === 'held') catchPos = { x: sim.ball.carrier.pos.x, y: sim.ball.carrier.pos.y };
        };
        sim.run();
        for (const c of cbs ?? []) {
          const r = c.row; r.cmp = !!sim.stats.completed;
          r.deepOver = !!(catchPos && (catchPos.x - los) * dir >= 15 && Math.sign(catchPos.y - ballY) === c.side);
          r.air = catchPos ? (catchPos.x - los) * dir : null;
          rows.push(r);
        }
      }
const at = (r: any, t: number) => r.ticks.find((k: any) => k.t >= t - 1e-9);
const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))].toFixed(2) : '-'; };
const R = rows; const ran = R.filter((r) => r.runAt !== null);
console.log(`PA plays ${plays}; deep-third CBs ${R.length}; read run at some point ${ran.length} (${(ran.length / R.length).toFixed(2)}), first run read median ${q(ran.map((r) => r.runAt), 0.5)} s; read pass median ${q(R.map((r) => r.passAt ?? NaN), 0.5)} s`);
const act: Record<string, number> = {}, labs: Record<string, number> = {}; const mv: number[] = [];
for (const r of ran) {
  const W2 = r.ticks.filter((k: any) => k.t >= r.runAt && k.t <= r.runAt + 0.5); const v = W2.reduce((s: number, k: any) => s + k.vx, 0) / W2.length; mv.push(v);
  const a = v > 0.5 ? 'sink' : v < -0.5 ? 'trigger' : 'squat'; act[a] = (act[a] ?? 0) + 1;
  const k = at(r, r.runAt + 0.25); if (k) labs[k.lab] = (labs[k.lab] ?? 0) + 1;
}
console.log(`on the run read (next 0.5 s): ${Object.entries(act).map(([k, n]) => `${k} ${(n / ran.length).toFixed(2)}`).join(', ')}; downfield vel p25/p50/p75 ${q(mv, .25)}/${q(mv, .5)}/${q(mv, .75)}`);
console.log(`  request label at +0.25 s: ${Object.entries(labs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${k} ${(n / ran.length).toFixed(2)}`).join(', ')}`);
for (const t of [1.0, 1.5, 2.0, 2.5]) {
  const K = R.map((r) => at(r, t)).filter(Boolean);
  const rel = K.map((k: any) => k.depth - k.deepest);
  console.log(`  ${t.toFixed(1)} s: n ${K.length} | his depth p50 ${q(K.map((k: any) => k.depth), .5)} | minus deepest receiver his side p25/p50/p75 ${q(rel, .25)}/${q(rel, .5)}/${q(rel, .75)} | under him (< 0) ${(rel.filter((x) => x < 0).length / rel.length).toFixed(2)} | read run ${(K.filter((k: any) => k.read === 'run').length / K.length).toFixed(2)}`);
}
const playsSeen = new Set(R.map((r) => `${r.concept}|${r.coverage}|${r.formation}|${r.seed}|${r.flip}`));
console.log(`completions 15+ yd caught on his side: ${R.filter((r) => r.deepOver).length} of ${R.length} corner-plays; plays ${playsSeen.size}, completed ${new Set(R.filter((r) => r.cmp).map((r) => `${r.concept}|${r.coverage}|${r.formation}|${r.seed}|${r.flip}`)).size}`);
for (const c of ['pa_post_dig', 'pa_shot', 'pa_flood']) { const S = R.filter((r) => r.concept === c); console.log(`  ${c}: corner-plays ${S.length}, 15+ his side ${S.filter((r) => r.deepOver).length}, run read ${(S.filter((r) => r.runAt !== null).length / S.length).toFixed(2)}`); }
