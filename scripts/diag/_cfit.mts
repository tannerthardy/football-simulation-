/** Coverage's 22 explosive Cover1/2-Man runs: front-seven fit at the carrier's LOS crossing and at +5 yd. */
import { PlaySim } from '../../src/sim/playsim.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickOffense, pickDefense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
const rows = `cover1 gun_doubles_11 power over false 2 1361 45 26.65
cover1 gun_trips_11 oz_strong over false 1 1400 45 26.65
cover1 ace_11 oz_strong over true 2 1458 55 29.7
cover1 pistol_11 oz_strong over true 0 1515 55 29.7
cover1 pistol_11 power over true 2 1530 55 29.7
cover1 pistol_11 power over true 1 1531 35 23.6
cover1 ace_12 power under false 0 1588 35 23.6
cover2man gun_doubles_11 power over false 0 1696 35 23.6
cover2man gun_doubles_11 power under false 1 1700 45 26.65
cover2man gun_doubles_11 power under true 2 1703 45 26.65
cover2man gun_trips_11 power over true 0 1755 55 29.7
cover2man ace_11 power under false 2 1812 55 29.7
cover2man pistol_11 oz_strong under true 1 1855 35 23.6
cover2man pistol_11 power over true 1 1867 35 23.6
cover2man pistol_11 power under true 0 1870 35 23.6
cover2man ace_12 oz_strong under false 1 1909 35 23.6
cover2man ace_12 power under false 0 1924 35 23.6
cover2man ace_12 power under true 1 1927 35 23.6
cover2man i_pro_21 oz_strong over true 2 1962 55 29.7
cover2man i_pro_21 oz_strong over true 1 1963 35 23.6
cover2man i_pro_21 oz_strong under true 2 1967 45 26.65
cover2man i_pro_21 power under true 1 1982 45 26.65`.split('\n').map((l) => l.trim().split(/\s+/));
const only = process.argv[2];
for (const [cov, form, run, front, flip, team, seed, los, ballY] of rows) {
  if (only && only !== seed) continue;
  const i = Number(team) + 1;
  const o = generateTeam(new Rng(100 + i), 'O', 'O', { strength: .55 }), d = generateTeam(new Rng(200 + i), 'D', 'D', { strength: .55 });
  const formation = FORMATION_BY_ID[form]; const pers: any = /12|21/.test(formation.personnel) ? 'base43' : 'nickel';
  const sim: any = new PlaySim({ offense: pickOffense(o, formation.personnel as any), defense: pickDefense(d, pers),
    offCall: { formation, flip: flip === 'true', kind: 'run', run: RUN_BY_ID[run], label: run } as any,
    defCall: { personnel: pers, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov } as any,
    los: Number(los), ballY: Number(ballY), firstDownX: 55, seed: Number(seed), audibles: false } as any);
  const dir = sim.attackDir(sim.offense[0].team);
  const trSlot = process.argv[3]; const tr = trSlot ? sim.recordCommands({ actor: { team: sim.defense[0].team, slot: trSlot }, from: 0.8, to: 3.6 }) : null;
  const snap = new Map(sim.defense.map((a: any) => [a, { x: (a.pos.x - sim.los) * dir, y: a.pos.y }]));
  const shots: Record<string, any> = {}; let firstHit: any = null;
  let guard = 0; const fell = new Map<any, number>(); const why = new Map<any, string>(); const lastTouch = new Map<any, string>();
  while (!sim.over && guard++ < 4000) {
    sim.tick();
    for (const k of sim.lastStep?.contacts ?? []) for (const [x, y] of [[k.i, k.j], [k.j, k.i]]) { const A = sim.agents[x], B = sim.agents[y]; if (A?.team !== sim.offense[0].team) lastTouch.set(A, `${B.team === A.team ? 'mate' : 'opp'}:${B.slot}@${sim.t.toFixed(2)}`); }
    for (const a of sim.defense) if (!fell.has(a) && a.body.support && a.body.support.state !== 'up') why.set(a, `${a.body.support.state} eng=${sim.engagements.find((e: any) => e.defender === a)?.blocker?.slot ?? '-'} lastTouch=${lastTouch.get(a) ?? '-'} spd=${Math.hypot(a.vel.x, a.vel.y).toFixed(1)}`);
    for (const a of sim.defense) if (!fell.has(a) && a.body.support && a.body.support.state !== 'up') fell.set(a, sim.t);
    const c = sim.carrier; if (!c || sim.handoffAt < 0) { if (sim.result || sim.outcome) break; continue; }
    const cx = (c.pos.x - sim.los) * dir;
    const take = (k: string) => { if (shots[k]) return; shots[k] = { t: sim.t, c: { x: cx, y: c.pos.y, slot: c.slot }, d: sim.defense.map((a: any) => ({ a, x: (a.pos.x - sim.los) * dir, y: a.pos.y,
      eng: sim.engagements.find((e: any) => e.defender === a)?.blocker?.slot, man: a.behavior?.target?.slot, dn: a.isDown(sim.t) ? (a.body.support?.state ?? 'timer') : '', v: a.vel ? { x: a.vel.x * dir, y: a.vel.y } : null })) }; };
    if (cx >= 0) take('los'); if (cx >= 5) take('+5');
    if (!firstHit) { const n = sim.defense.find((a: any) => Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) < 1.0); if (n) firstHit = { t: sim.t, slot: n.slot, cx }; }
    if (trSlot && sim.t > 2.3 && sim.t < 3.0 && Math.round(sim.t*40)%4===0) { const m = sim.defense.find((a: any) => a.slot === trSlot);
      const cs = (sim.lastStep?.contacts ?? []).filter((k: any) => k.i === m.idx || k.j === m.idx).map((k: any) => { const o = sim.agents[k.i === m.idx ? k.j : k.i]; return `${o.team}:${o.slot}`; });
      console.log(`   t=${sim.t.toFixed(2)} down=${m.isDown?.(sim.t)} contacts=${cs.join(',') || '-'} keys=${Object.keys(m).filter((k) => /fall|down|stun|ground|lock|stall|bond/i.test(k)).map((k) => k + '=' + JSON.stringify(m[k])?.slice(0, 40)).join(' ')}`); }
    if (cx >= 12) break;
    if (sim.t > 10) break;
  }
  if (tr) for (const st of tr.steps) { if (!st.final || Math.round(st.stepStart*20)%3) continue; const dd: any = st.decision;
    console.log(`  ${st.stepStart.toFixed(2)} ${dd?.owner?.kind ?? '-'} ${dd?.owner?.label ?? dd?.owner?.name ?? ''} raw=(${dd?.raw?.vel?.x?.toFixed(1)},${dd?.raw?.vel?.y?.toFixed(1)}) rew=${st.rewrites.map((r: any) => r.stage).join(',') || '-'} final=(${st.final.vel.x.toFixed(1)},${st.final.vel.y.toFixed(1)}) got=(${st.endpoint.body.velocity.x.toFixed(1)},${st.endpoint.body.velocity.y.toFixed(1)})`); }
  console.log(`\n== ${seed} ${cov} ${form} ${run} ${front} flip=${flip}  handoff ${sim.handoffAt.toFixed(2)}  firstWithin1yd ${firstHit ? `${firstHit.slot} @${firstHit.t.toFixed(2)} cx=${firstHit.cx.toFixed(1)}` : '-'}`);
  console.log(' falls: ' + [...fell].map(([a, t]) => `${a.slot}@${t.toFixed(2)}[${why.get(a)}]`).join(' '));
  for (const k of ['los', '+5']) { const s = shots[k]; if (!s) continue;
    const side = (y: number) => (y - s.c.y);
    console.log(` ${k} t=${s.t.toFixed(2)} carrier ${s.c.slot} y=${s.c.y.toFixed(1)}`);
    for (const r of s.d) { const sn: any = snap.get(r.a); if (/^(CB|FS|SS)/.test(r.a.slot) && Math.hypot(r.x - s.c.x, side(r.y)) > 12) continue;
      console.log(`   ${r.a.slot.padEnd(5)} snap(${sn.x.toFixed(1)},${(sn.y - s.c.y).toFixed(1)}) now dx=${(r.x - s.c.x).toFixed(1)} dy=${side(r.y).toFixed(1)} ${r.eng ? 'blk:' + r.eng : 'FREE'} job=${r.a.behavior?.kind ?? '?'}${r.man ? ':' + r.man : ''} v=(${r.v?.x.toFixed(1)},${r.v?.y.toFixed(1)}) fit=${r.a.runFit?.kind ?? '-'}${r.a.runFit?.gap ?? ''}${r.dn ? ' DOWN:' + r.dn : ''}`); }
  }
}
