/** Counter plays that end at/behind the LOS (shift 0): the first defender to contact the carrier behind the LOS
 * (carrierEvents hit/wrap), where he lined up (rel. pulling guard snap spot / play side), his engagements
 * (blocker, start-end, how it ended: 'shed' event text), whether engaged at contact, carrier depth. args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const tally: Record<string, number> = {}; const add = (k: string) => tally[k] = (tally[k] ?? 0) + 1;
for (const seed of process.argv.slice(2)) for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (sim.offCall.run?.scheme !== 'counter' || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const dir = sim.attackDir('O');
  const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
  const kicker = pullers.find((o: any) => o.behavior.plan.pullRole === 'kick'), kickTgt = kicker?.behavior.plan.target;
  const ps = Math.sign(pullers.reduce((s: number, o: any) => s + ((o.behavior.plan.pullPath?.at(-1)?.y ?? o.pos.y) - o.pos.y), 0)) || 1;
  const spots = pullers.map((o: any) => o.pos.y);
  const snap = new Map(sim.defense.map((d: any) => [d, { ...d.pos }]));
  const eng = new Map<any, any[]>(); let first: any = null, seenEv = 0;
  while (sim.phase === 'live' && sim.t < 5) {
    sim.tick();
    for (const e of sim.engagements) {
      const L = eng.get(e.defender) ?? eng.set(e.defender, []).get(e.defender)!;
      const last = L.at(-1);
      if (!last || last.b !== e.blocker.slot || last.end < sim.t - 0.06) L.push({ b: e.blocker.slot, start: sim.t, end: sim.t }); else last.end = sim.t;
    }
    const c = sim.carrier, fresh = sim.events.slice(seenEv); seenEv = sim.events.length;
    if (!first && c && c !== sim.qb) for (const ev of fresh.filter((x: any) => ['hit', 'tackle_wrap', 'tackle', 'carrier_contact'].includes(x.type))) {
      const d = sim.agents[ev.type === 'carrier_contact' ? ev.b : ev.a] ?? null; if (!d || d.team !== 'D') continue;
      first = { d, t: sim.t, cx: (c.pos.x - sim.los) * dir, engagedNow: sim.engagements.some((e: any) => e.defender === d) }; break;
    }
  }
  const crossed = (sim.result?.yards ?? 9) > 0;
  if (!first || first.cx > 0) continue;
  const d = first.d, s0: any = snap.get(d);
  const where = spots.some((y: number) => Math.abs(s0.y - y) < 1.2) ? 'over vacated spot' : (s0.y - sim.ballY) * ps > 0 ? 'play side' : 'back side';
  const role = d === kickTgt ? ' (kick target)' : '';
  const E = eng.get(d) ?? [];
  const k = `${d.slot.replace(/_[SW]$/, '')} ${where}${role} | ${first.engagedNow ? 'engaged at contact' : E.length ? 'shed/free at contact' : 'never blocked'}`;
  add(k);
  console.log(`s${seed}#${pi} ${d.slot} ${where}${role} t ${first.t.toFixed(2)} carrier ${first.cx.toFixed(1)} | ${first.engagedNow ? 'ENGAGED' : 'free'} | eng ${E.map((x: any) => `${x.b}@${x.start.toFixed(2)}-${x.end.toFixed(2)}`).join(' ') || '-'} | sheds ${sim.events.filter((x: any) => x.type === 'shed' && sim.agents[x.a] === d).map((x: any) => x.t.toFixed(2) + ' ' + (x.note ?? '')).join('; ')}`);
}
console.log(Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v}  ${k}`).join('\n'));
