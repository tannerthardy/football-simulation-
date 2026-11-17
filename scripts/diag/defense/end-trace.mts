// PA backside end per tick under PA_HINGE: DE_W's decision tags per 0.1 s, his offset outside his tackle (LT), depth past
// the line, his tackle's stance / velocity (depth, lateral toward the ball) and the runStep inputs.
//   CONCEPT_DROPS=1 QB_FOOTWORK=1 PA_HINGE=1 node --import tsx scripts/diag/defense/end-trace.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { paFakeSide } = await import(`${W}/src/sim/pa-look.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const T = Array.from({ length: 21 }, (_, i) => +(i * 0.1).toFixed(1));
const rows: any[] = [];
for (const concept of ['pa_flood', 'pa_post_dig', 'pa_shot'])
  for (const coverage of ['cover1', 'cover3'])
    for (const roster of [3, 7]) for (let seed = 1; seed <= 3; seed++) {
      let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11' })); } catch (e) { continue; }
      const de = sim.defense.find((d: any) => d.slot === (process.env.END ?? 'DE_W')); if (!de) continue;
      const dir = sim.attackDir(sim.offense[0].team); const by = sim.ballY;
      const side = Math.sign(de.pos.y - by) || 1;
      const lt = sim.offense.slice().filter((o: any) => /^(LT|RT)$/.test(o.slot)).sort((p: any, q: any) => Math.abs(p.pos.y - de.pos.y) - Math.abs(q.pos.y - de.pos.y))[0];
      let tick = new Set<string>(); const add0 = de.tags.add.bind(de.tags); de.tags.add = (t: string) => { tick.add(t); return add0(t); };
      const r: any = {}; const tk = sim.tick.bind(sim);
      sim.tick = () => { tick = new Set(); tk(); const k = +(Math.round(sim.t * 10) / 10).toFixed(1);
        if (k <= 2.0 && r[k] === undefined) r[k] = { tags: [...tick].join('+') || '-', off: (de.pos.y - lt.pos.y) * side, dep: (sim.los - de.pos.x) * -dir * -1, ltvx: lt.vel.x * dir, ltvy: lt.vel.y * -side, st: lt.stance, eng: !!de.engagement }; };
      sim.run(); r.fake = (paFakeSide.get(sim) ?? 0) * side; rows.push(r);
    }
const med = (v: number[]) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)].toFixed(2) : '-'; };
console.log(`DE_W on PA, n ${rows.length}  (off = outside his tackle; dep = past the line; tackle depth vel (+ upfield) and lateral (+ toward the ball))`);
for (const t of T) {
  const S = rows.map((r) => r[t]).filter(Boolean);
  const tags: Record<string, number> = {}; for (const s of S) tags[s.tags] = (tags[s.tags] ?? 0) + 1;
  console.log(`${t.toFixed(1)} off ${med(S.map((s) => s.off))} dep ${med(S.map((s) => s.dep))} | LT vx ${med(S.map((s) => s.ltvx))} vy ${med(S.map((s) => s.ltvy))} low ${S.filter((s) => s.st === 'low').length}/${S.length} | engaged ${S.filter((s) => s.eng).length} | ${Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} ${n}`).join(', ')}`);
}
const fk: Record<string, number> = {}; for (const r of rows) fk[String(r.fake)] = (fk[String(r.fake)] ?? 0) + 1;
console.log(`fake side relative to DE_W (+1 = toward DE_W, -1 = away, 0 = none): ${JSON.stringify(fk)}`);
