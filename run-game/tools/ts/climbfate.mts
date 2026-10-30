/** Per installed double: decision release, physical leave (last tick within 1.5 yd of a first-level man), reached +2 before carrier. */
import { readFileSync, writeFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const rows: any[] = [];
for (const f of process.argv.slice(2, -1)) for (const p of deserialize(readFileSync(f)) as any[]) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  sim.tick(); const dir = sim.attackDir('O'), los = sim.los;
  const depth = (a: any) => (a.pos.x - los) * dir;
  const first = sim.defense.filter((d: any) => depth(d) <= 1.5);
  const jobs: any[] = [];
  for (const o of sim.offense) { const c = o.behavior instanceof RunBlocker ? o.behavior.plan?.combination : null; if (c && c.members[1] === o) jobs.push({ c, members: c.members, rel: -1, leaver: null, lastNear: -1, nearDown: 0, nearOther: 0, engagedDown: 0, keeperOn: 0, ticks: 0, reach2: -1, maxDepth: -99 }); }
  let carrier: any = null, carrier2 = -1;
  while (sim.phase === 'live' && sim.t < 8) {
    sim.tick(); const t = +sim.t.toFixed(2);
    if (sim.carrier && sim.carrier !== sim.qb && sim.carrier.team === 'O') carrier = sim.carrier;
    if (carrier && carrier2 < 0 && depth(carrier) >= 2) carrier2 = t;
    for (const j of jobs) {
      if (j.rel < 0 && j.c.released) { j.rel = t; j.leaver = j.members.find((m: any) => m.behavior?.plan?.kind === 'climb') ?? null;
        if (j.leaver) { const L = j.leaver, B = j.c.backer, D = j.c.defender;
          j.geo = { bUp: +((B.pos.x - L.pos.x) * dir).toFixed(2), bLat: +Math.abs(B.pos.y - L.pos.y).toFixed(2),
            dUp: +((D.pos.x - L.pos.x) * dir).toFixed(2),
            // down man between: his projection on the climber->backer segment lies inside it and within 1 yd of the line
            keeperBetween: (() => { const K = j.members.find((m: any) => m !== L); const ax = B.pos.x - K.pos.x, ay = B.pos.y - K.pos.y, l2 = ax*ax+ay*ay; const u = ((D.pos.x-K.pos.x)*ax+(D.pos.y-K.pos.y)*ay)/l2;
              const px = K.pos.x+u*ax-D.pos.x, py = K.pos.y+u*ay-D.pos.y; return u > 0 && u < 1 && Math.hypot(px,py) < 1.0; })(),
            sameSide: (() => { const K = j.members.find((m: any) => m !== L); return Math.sign(L.pos.y - D.pos.y) === Math.sign(B.pos.y - D.pos.y) ? 'climber' : Math.sign(K.pos.y - D.pos.y) === Math.sign(B.pos.y - D.pos.y) ? 'keeper' : 'neither'; })(),
            between: (() => { const ax = B.pos.x - L.pos.x, ay = B.pos.y - L.pos.y, l2 = ax*ax+ay*ay; const u = ((D.pos.x-L.pos.x)*ax+(D.pos.y-L.pos.y)*ay)/l2;
              const px = L.pos.x+u*ax-D.pos.x, py = L.pos.y+u*ay-D.pos.y; return u > 0 && u < 1 && Math.hypot(px,py) < 1.0; })() }; } }
      if (j.leaver && j.reach2 < 0 && carrier2 < 0) {
        const near = first.filter((d: any) => Math.hypot(d.pos.x - j.leaver.pos.x, d.pos.y - j.leaver.pos.y) <= 1.5);
        if (near.length) j.lastNear = t;
        j.ticks++; if (near.includes(j.c.defender)) j.nearDown++; if (near.some((d: any) => d !== j.c.defender)) j.nearOther++;
        if (sim.engagements.some((e: any) => e.defender === j.c.defender && (e.blocker === j.leaver || e.helpers.includes(j.leaver)))) j.engagedDown++;
        const keeper = j.members.find((m: any) => m !== j.leaver); if (sim.engagements.some((e: any) => e.defender === j.c.defender && (e.blocker === keeper || e.helpers.includes(keeper)))) j.keeperOn++;
        j.maxDepth = Math.max(j.maxDepth, depth(j.leaver));
        if (depth(j.leaver) >= 2) j.reach2 = t;
      }
    }
  }
  for (const j of jobs) rows.push({ id: p.id, members: j.members.map((m: any) => m.slot).join('+'), rel: j.rel, leaver: j.leaver?.slot ?? null, lastNear: j.lastNear, reach2: j.reach2, maxDepth: +j.maxDepth.toFixed(2), carrier2, geo: j.geo, ticks: j.ticks, nearDown: j.nearDown, nearOther: j.nearOther, engagedDown: j.engagedDown, keeperOn: j.keeperOn, req: j.req });
}
writeFileSync(process.argv.at(-1)!, JSON.stringify(rows, null, 1));
const n = rows.length, never = rows.filter(r => r.rel < 0).length, climbed = rows.filter(r => r.reach2 >= 0).length;
const relNo = rows.filter(r => r.rel >= 0 && r.reach2 < 0);
const stuck = relNo.filter(r => r.lastNear >= 0 && (r.carrier2 < 0 || r.lastNear >= r.carrier2 - 0.3)).length;
const gaps = rows.filter(r => r.rel >= 0 && r.lastNear >= 0).map(r => r.lastNear - r.rel).sort((a, b) => a - b);
console.log(`doubles ${n}: never released ${never}; released and reached +2 before carrier ${climbed}; released but not: ${relNo.length} (still within 1.5 yd of a first-level man until ~carrier: ${stuck})`);
console.log(`decision -> physical leave (last tick within 1.5 yd of first level): p25/p50/p75 ${[.25,.5,.75].map(q => gaps[Math.floor(q*(gaps.length-1))]?.toFixed(2)).join('/')} s (n ${gaps.length})`);
console.log('released-not-climbed maxDepth p50', relNo.map(r => r.maxDepth).sort((a,b)=>a-b)[Math.floor(relNo.length/2)]);
