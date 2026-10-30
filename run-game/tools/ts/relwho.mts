/** Joined zone doubles: per member (covered = nearer the DL at the snap) the gate result of each personal release read;
 * who released; and on release reads where both proposed, who won. args: seeds... (env SCH) */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const SCH = (process.env.SCH ?? 'insideZone').split(',');
const tally: Record<string, number> = {}; const add = (k: string, n = 1) => tally[k] = (tally[k] ?? 0) + n;
let cur = new Map<any, Map<any, string>>();
(globalThis as any).__CMB = (obs: any, combo: any, why: string) => {
  if (!cur.has(combo)) cur.set(combo, new Map());
  if (!cur.get(combo)!.has(obs) || why !== 'unjoined') cur.get(combo)!.set(obs, why.replace(/^keeper:.*/, m => m));
};
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme;
  if (!SCH.includes(sch) || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const cov = new Map<any, any>(); const pre = new Map<any, any>();
  while (sim.phase === 'live' && sim.t < 4) {
    cur = new Map();
    for (const o of sim.offense) { const cb = o.behavior instanceof RunBlocker && o.behavior.plan.combination;
      if (cb && !cov.has(cb)) cov.set(cb, cb.members.reduce((x: any, y: any) => Math.hypot(x.pos.x - cb.defender.pos.x, x.pos.y - cb.defender.pos.y) <= Math.hypot(y.pos.x - cb.defender.pos.x, y.pos.y - cb.defender.pos.y) ? x : y)); }
    for (const cb of cov.keys()) pre.set(cb, cb.released);
    sim.tick();
    for (const [cb, cm] of cov) {
      if (pre.get(cb)) continue;
      const ws = cur.get(cb);
      if (ws) for (const [m, w] of ws) if (w !== 'unjoined') add(`${sch} ${m === cm ? 'covered  ' : 'uncovered'} read: ${w}`);
      if (ws && [...ws.values()].filter(w => w === 'proposed').length === 2) add(`${sch} both proposed`);
      if (cb.released) {
        const climber = cb.members.find((m: any) => !(m.behavior?.plan?.target === cb.defender));
        add(`${sch} released, climber ${climber === cm ? 'covered' : climber ? 'uncovered' : '?'}`);
        if (ws && [...ws.values()].filter(w => w === 'proposed').length === 2) add(`${sch} both proposed, climber ${climber === cm ? 'covered' : 'uncovered'}`);
        const e = cb.defender.engagement;
        add(`${sch} released; covered was ${e?.blocker === cm ? 'owner' : 'helper/none'}`);
      }
    }
  }
}
for (const k of Object.keys(tally).sort()) console.log(k.padEnd(70), tally[k]);
