// An attached end's release against a rusher (Integration #35 item 2: double_outs' attached Y is met by the end at
// 0.7 s and driven back). Staged pass plays with an inline end on a route (not kept in): per end, the first defender
// whose body comes within contact (radii + 0.15 yd) before 2.0 s, who he is (DL / LB, rushing or not), the time; then
// over the next 0.6 s the end's requested velocity and achieved velocity along his route's first leg (+ = upfield), his
// behaviour tags (route-craft, press release), whether a press/jam contact or an engagement touches him, and his depth
// past the line at 1.0 / 1.5 / 2.0 s. Same for ends never touched (control). Rows to stdout as JSON lines.
// usage: node --import tsx scripts/diag/pass-operators/attached-release.mts [concepts] > rows.jsonl
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const CONCEPTS = (process.argv[2] ?? 'double_outs,curl_flat,smash,stick,y_cross,hitch_cross').split(',');
const FORMS = ['gun_trey_11', 'ace_11', 'ace_12', 'gun_wing_12'];
const COVS = ['cover1', 'cover3', 'cover2', 'cover4'];
for (const concept of CONCEPTS) for (const formation of FORMS) for (const coverage of COVS) for (let roster = 1; roster <= 6; roster++) for (const seed of [1, 2]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
  const dir = sim.attackDir(sim.offense[0].team), los = sim.los;
  const ends = sim.offense.filter((a: any) => sim.offAlign.spots[a.slot]?.inline);
  const rec = ends.map((a: any) => ({ a, slot: a.slot, beh0: null as any, first: null as any, win: [] as any[], depth: {} as any, y0: a.pos.y }));
  while (sim.phase === 'live' && sim.t < 2.05) {
    const tStart = sim.t;
    sim.tick();
    for (const r of rec) {
      const a = r.a, b = a.behavior;
      if (r.beh0 === null) r.beh0 = b?.kind ?? null;
      if (!r.first) for (const d of sim.defense) {
        const dd = Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y);
        if (dd <= a.profile.radius + d.profile.radius + 0.15) {
          r.first = { t: +sim.t.toFixed(2), slot: d.slot, pos: d.player.position, beh: d.behavior?.kind ?? null, rushing: !!d.tags?.has?.('rusher') || d.behavior?.kind === 'rush', dMass: d.profile.mass, aMass: a.profile.mass, depth: +((a.pos.x - los) * dir).toFixed(2) };
          r.d = d; break;
        }
      }
      if (r.first && sim.t - r.first.t <= 0.6) {
        const d = r.d, cmd = sim.cmds[sim.agents.indexOf(a)]?.vel;
        r.win.push({ t: +(sim.t - r.first.t).toFixed(2), kind: b?.kind, tags: [...(a.tags ?? [])].filter((x: string) => /craft|press|release|jam|block/.test(x)),
          reqX: cmd ? +(cmd.x * dir).toFixed(2) : null, reqY: cmd ? +cmd.y.toFixed(2) : null, vX: +(a.vel.x * dir).toFixed(2), vY: +a.vel.y.toFixed(2),
          dvX: +(d.vel.x * dir).toFixed(2), gap: +Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y).toFixed(2), eng: !!a.engagement, dEng: d.engagement ? (d.engagement.blocker === a ? 'me' : 'other') : null,
          aUp: a.body?.support?.state ?? 'up', ahead: +((d.pos.x - a.pos.x) * dir).toFixed(2), side: +((d.pos.y - a.pos.y)).toFixed(2) });
      }
      for (const k of [1.0, 1.5, 2.0]) if (tStart < k && sim.t >= k) r.depth[k] = +((a.pos.x - los) * dir).toFixed(2);
    }
  }
  for (const r of rec) console.log(JSON.stringify({ concept, formation, coverage, roster, seed, slot: r.slot, beh0: r.beh0, first: r.first, depth: r.depth, win: r.win }));
}
