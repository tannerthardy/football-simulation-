/** Zone doubles with a climb backer, from 0.5 s until released or the carrier reaches the backer: per member read,
 * the first stage that stops the release (joined reads), or why the pair is not joined. Release time and outcome. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const fam = process.argv[2], seeds = process.argv.slice(3);
const miss: Record<string, number> = {}; const mrow: number[][] = []; const st: Record<string, number> = {}, un: Record<string, number> = {}, early: Record<string, number> = {};
let combos = 0, rel = 0, relLate = 0, never = 0; const relT: number[] = [];
let cur: Map<any, any> | null = null, now = 0;
(globalThis as any).__JC = (obs: any, k: string) => { const c = cur?.get(obs); if (c && c.live) { st[k] = (st[k] ?? 0) + 1; if (now < 1.2) early[k] = (early[k] ?? 0) + 1; } };
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? '';
  if (fam === 'OZ' ? !/^(outsideZone|wideZone)$/.test(sch) : !/^(insideZone|splitZone)$/.test(sch)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const dir = sim.attackDir('O'); const by = new Map<any, any>(); cur = new Map();
  for (const o of sim.offense) { const cb = o.behavior?.plan?.combination; if (cb?.backer && !by.has(cb)) by.set(cb, { cb, rel: -1, arrive: -1, live: false, ps: playSideSign(sim, sim.offCall.run) }); }
  for (const r of by.values()) for (const m of r.cb.members) cur.set(m, r);
  while (sim.phase === 'live' && sim.t < 4) {
    now = sim.t;
    for (const r of by.values()) r.live = r.rel < 0 && r.arrive < 0 && sim.t >= .5;
    sim.tick();
    const c = sim.carrier;
    for (const r of by.values()) {
      if (r.rel < 0 && r.cb.released) r.rel = sim.t;
      if (r.arrive < 0 && c && c !== sim.qb && (c.pos.x - r.cb.backer.pos.x) * dir > -1) r.arrive = sim.t;
      if (r.rel < 0 && r.arrive < 0 && sim.t >= .5) {
        const e = r.cb.defender.engagement, joined = e && r.cb.members.every((m: any) => m.engagement === e);
        if (!joined) { const k = !e ? 'DL unengaged' : r.cb.members.filter((m: any) => m.engagement === e).length === 1 ? 'one member on him' : 'members elsewhere'; un[k] = (un[k] ?? 0) + 1;
          if (k === 'one member on him') {
            const on = r.cb.members.find((m: any) => m.engagement === e), off = r.cb.members.find((m: any) => m !== on), d = r.cb.defender;
            const dd = Math.hypot(off.pos.x - d.pos.x, off.pos.y - d.pos.y), reach = off.profile.radius + d.profile.radius + .1 + off.player.measurables.armIn / 36 * .45;
            const ps = Math.sign(r.ps) || 1, lag = (d.pos.y - off.pos.y) * ps; // + : DL is play-side of the missing member
            const pl = off.behavior?.plan, eng = off.engagement ? 'engaged w/ ' + (off.engagement.defender === d ? 'DL?' : off.engagement.defender.slot.replace(/_.*/, '')) : 'free';
            const w = `${on === r.cb.members[0] ? 'helper' : 'owner'} missing | ${eng} | plan ${pl?.kind}${pl?.target === d ? '' : '->other'} | ${dd < reach ? 'within reach' : dd < reach + .5 ? '<0.5 yd short' : dd < reach + 1.5 ? '0.5-1.5 short' : '>1.5 short'} | DL ${lag > .5 ? 'play-side of him' : lag < -.5 ? 'back-side of him' : 'level'}`;
            miss[w] = (miss[w] ?? 0) + 1;
            const speed = Math.hypot(off.vel.x, off.vel.y), dlLat = d.vel.y * ps, offLat = off.vel.y * ps; mrow.push([dd, dlLat, offLat, speed]);
          } }
        else un['joined'] = (un['joined'] ?? 0) + 1;
      }
    }
  }
  for (const r of by.values()) {
    combos++;
    const arrive = r.arrive < 0 ? 9 : r.arrive;
    if (r.rel >= 0 && r.rel <= arrive) { rel++; relT.push(r.rel); } else if (r.rel >= 0) relLate++; else never++;
  }
}
relT.sort((a, b) => a - b);
console.log(`${fam} doubles with a backer: ${combos}; released before the carrier reaches the backer ${rel} (median ${relT[relT.length >> 1]?.toFixed(2)} s), after ${relLate}, never ${never}`);
const tot = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
console.log(`  pair state per tick (0.5 s until release/arrival), ${tot(un)} ticks:`);
for (const [k, v] of Object.entries(un).sort((a, b) => b[1] - a[1])) console.log(`    ${(100 * v / tot(un)).toFixed(0)}%  ${k}`);
console.log(`  joined reads, stopping stage (${tot(st)} reads):`);
for (const [k, v] of Object.entries(st).sort((a, b) => b[1] - a[1])) console.log(`    ${(100 * v / tot(st)).toFixed(0)}%  ${k}`);
console.log(`  same, reads before 1.2 s (${tot(early)}):`);
for (const [k, v] of Object.entries(early).sort((a, b) => b[1] - a[1])) console.log(`    ${(100 * v / tot(early)).toFixed(0)}%  ${k}`);

const md = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
console.log(`  one member on him: missing member distance to DL med ${md(mrow.map(r => r[0])).toFixed(2)}, DL lateral to play side ${md(mrow.map(r => r[1])).toFixed(2)}, missing member lateral ${md(mrow.map(r => r[2])).toFixed(2)}, speed ${md(mrow.map(r => r[3])).toFixed(2)}`);
const mt = tot(miss);
for (const [k, v] of Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`    ${(100 * v / mt).toFixed(0)}%  ${k}`);
