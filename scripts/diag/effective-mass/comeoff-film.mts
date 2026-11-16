// The come-off on film, ours (Integration, 2026-11-15; hand-fight note section 7): interior pass rushers who release
// (interior-fight.py's definition: separation past 1.2 yd or the rusher past 70 deg off the blocker's line to the QB,
// within 2.5 s of contact, before the throw) and whose blocker is past 1.2 yd at +0.5 s. For each, from the release
// to +2.0 s (or the throw), every 0.1 s:
//   the rusher: speed, closing on the QB, his request's heading against the true QB and against the QB as he sees him
//     (sim.see at the pursuit delay), engaged or not, his tags;
//   the helper (the nearest other OL): distance, engaged with him (as blocker or helper), his velocity toward him, his
//     facing against the bearing to him, his perception's error on him (sim.see), whom he is blocking;
//   the QB: speed, his velocity's component away from the rusher, toward the line, his request's heading.
// Only cases whose blocker is past 1.2 yd at +0.5 s are written.
// usage: node --import tsx scripts/diag/effective-mass/comeoff-film.mts [seed] [games] [examples] > rows.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4), nex = Number(process.argv[4] ?? 12);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const IN = new Set(['LG', 'C', 'RG']), OLS = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
const cases: any[] = [];
const deg = (a: number) => a * 180 / Math.PI, wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
let play = 0;
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  play++;
  const pairs = new Map<string, any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const qb = sim.qb; if (!qb) return;
    const thrown = sim.throwAt >= 0;
    // New pairs: an interior OL and the nearest DL within 1.2 yd, from 0.2 s.
    if (sim.t >= 0.2 && sim.t <= 2.0 && !thrown) for (const b of sim.offense) {
      if (!IN.has(b.slot)) continue;
      if ([...pairs.values()].some(p => p.b === b)) continue;
      const dl = sim.defense.filter((d: any) => d.behavior?.kind === 'rush')
        .map((d: any) => ({ d, r: Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) })).filter((x: any) => x.r <= 1.2).sort((x: any, y: any) => x.r - y.r)[0];
      if (dl) pairs.set(b.slot, { b, d: dl.d, t0: sim.t, rel: null, frames: [] });
    }
    for (const p of pairs.values()) {
      const { b, d } = p;
      if (p.done) continue;
      const bx = b.pos.x, by = b.pos.y, qx = qb.pos.x, qy = qb.pos.y;
      const ux = qx - bx, uy = qy - by, L = Math.hypot(ux, uy) || 1, rx = d.pos.x - bx, ry = d.pos.y - by;
      const sep = Math.hypot(rx, ry), ang = deg(Math.atan2((rx * -uy + ry * ux) / L, -(rx * ux + ry * uy) / L));
      if (!p.rel) {
        if (thrown || sim.t - p.t0 > 2.5) { p.done = true; continue; }
        if (sep > 1.2 || Math.abs(ang) > 70) p.rel = { t: sim.t, by: sep > 1.2 ? 'sep' : 'shoulder' };
        else continue;
      }
      const dt = sim.t - p.rel.t;
      if (dt > 2.0 + 1e-9 || thrown) { p.done = true; continue; }
      if (Math.abs(dt / 0.1 - Math.round(dt / 0.1)) > 0.01) continue;
      const dq = Math.hypot(d.pos.x - qx, d.pos.y - qy);
      const toQb = Math.atan2(qy - d.pos.y, qx - d.pos.x);
      const seenQb = sim.see(d, qb, 0.5).pos, toSeen = Math.atan2(seenQb.y - d.pos.y, seenQb.x - d.pos.x);
      const iv = sim.intents?.[d.idx]?.vel ?? { x: 0, y: 0 }, req = Math.atan2(iv.y, iv.x);
      const helpers = sim.offense.filter((o: any) => OLS.has(o.slot) && o !== b)
        .map((o: any) => ({ o, r: Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) })).sort((x: any, y: any) => x.r - y.r);
      const h = helpers[0]?.o;
      let help: any = null;
      if (h) {
        const hb = Math.atan2(d.pos.y - h.pos.y, d.pos.x - h.pos.x), hr = Math.hypot(d.pos.x - h.pos.x, d.pos.y - h.pos.y) || 1;
        const seen = sim.see(h, d);
        const eng = sim.engagements.find((e: any) => e.defender === d && (e.blocker === h || e.helpers?.includes(h)));
        help = { slot: h.slot, r: +hr.toFixed(2), engaged: eng ? (eng.blocker === h ? 'blocker' : 'helper') : null,
          vToward: +(((h.vel.x * (d.pos.x - h.pos.x) + h.vel.y * (d.pos.y - h.pos.y)) / hr)).toFixed(2),
          faceOff: +Math.abs(deg(wrap(h.body.facing - hb))).toFixed(0),
          seenErr: +Math.hypot(seen.pos.x - d.pos.x, seen.pos.y - d.pos.y).toFixed(2),
          busy: h.engagement ? h.engagement.defender.slot : null };
      }
      const qv = qb.vel, away = (qv.x * (qx - d.pos.x) + qv.y * (qy - d.pos.y)) / (dq || 1);
      const qiv = sim.intents?.[qb.idx]?.vel ?? { x: 0, y: 0 };
      const up = -(qv.x) * sim.attackDir(qb.team) * -1;
      p.frames.push({ dt: +dt.toFixed(1), bR: +sep.toFixed(2), dq: +dq.toFixed(2), rSpeed: +Math.hypot(d.vel.x, d.vel.y).toFixed(2),
        closing: +(-((d.vel.x - qv.x) * (qx - d.pos.x) + (d.vel.y - qv.y) * (qy - d.pos.y)) / (dq || 1) * -1).toFixed(2),
        reqOffTrue: +Math.abs(deg(wrap(req - toQb))).toFixed(0), reqOffSeen: +Math.abs(deg(wrap(req - toSeen))).toFixed(0),
        seenQbErr: +Math.hypot(seenQb.x - qx, seenQb.y - qy).toFixed(2), rEngaged: !!d.engagement, rWith: d.engagement ? `${d.engagement.blocker.slot}${d.engagement.helpers?.length ? '+' + d.engagement.helpers.map((x: any) => x.slot).join('+') : ''}` : null, rTags: [...d.tags].slice(-4).join(','),
        help, qbSpeed: +Math.hypot(qv.x, qv.y).toFixed(2), qbAway: +away.toFixed(2), qbUp: +(qv.x * sim.attackDir(qb.team)).toFixed(2),
        qbReqSpeed: +Math.hypot(qiv.x, qiv.y).toFixed(2), qbTags: [...qb.tags].slice(-4).join(',') });
      void up;
    }
  };
  const res = sim.run();
  for (const p of pairs.values()) {
    if (!p.rel) continue;
    const f5 = p.frames.find((f: any) => f.dt === 0.5);
    if (!f5) continue;
    if (f5.bR <= 1.2) continue;
    cases.push({ id: `S${first}-G${g}-P${play}`, slot: p.b.slot, rusher: p.d.slot, by: p.rel.by, t: +(p.rel.t - p.t0).toFixed(1), frames: p.frames });
  }
  return res;
} } });
for (const c of cases) console.log(JSON.stringify(c));
void nex;
