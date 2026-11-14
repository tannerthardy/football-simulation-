// node --import tsx scripts/diag/eyes/come-free.ts [FLAG=value ...]
// A rusher who comes free of his block, with nothing teleported. Once the quarterback is set, the engaged rusher nearest
// him (2.5-5 yd away) is let go: the engagement is ended and his blocker is put on the ground where he stands (given nothing to do and held down). The
// rusher then accelerates at the quarterback from the speed the block had left him. This is the case a held-velocity
// picture reads late (a man who speeds up or turns), unlike a placed man already at speed. Read per play and in total:
// did the alarm fire, how long before the man was within 1 yd of him, and was he sacked with no alarm.
// Stack flags come from the reference stack file; overrides from argv.
import { readFileSync } from 'node:fs';
const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on') process.env[k] = '1';
for (const kv of process.argv.slice(2)) { const [k, v] = kv.split('='); process.env[k] = v; }
const { PlaySim } = await import('../../../src/sim/playsim.js');
const { nativeTraceSetup } = await import('../command-trace.js');
const { stand } = await import('../../../src/sim/behaviors/common.js');
const CONCEPTS = ['post_cross', 'dagger', 'drive', 'comebacks', 'hitch_cross', 'seam_hitch', 'smash', 'corner_flat'];
let freed = 0, al = 0, sk = 0, skNo = 0, reached = 0; const lead: number[] = [], lag: number[] = [];
for (const concept of CONCEPTS) for (const coverage of ['cover1', 'cover3']) for (const seed of [2, 3, 4]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
  const parked: any[] = []; let qb: any = null, man: any = null, at = -1, d0 = 0, v0 = 0, contact = -1, setAt = -1; const tick = sim.tick.bind(sim);
  sim.tick = () => {
    for (const o of parked) if (o.body.support) o.body.support.state = 'down';
    tick();
    const q = sim.qb;
    if (!qb && q.behavior.kind === 'qb-pass') qb = q.behavior;
    if (!qb || sim.carrier !== q || q.behavior !== qb) return;
    if (setAt < 0 && qb.phase === 'set') setAt = sim.t;
    if (!man && setAt >= 0 && sim.t >= setAt + 0.1) {
      let best = Infinity;
      for (const d of sim.defense) {
        const e = d.engagement; if (!e || d.isDown(sim.t)) continue;
        const gap = Math.hypot(d.pos.x - q.pos.x, d.pos.y - q.pos.y);
        if (gap >= 2.5 && gap <= 5 && gap < best) { best = gap; man = d; }
      }
      if (man) {
        const e = man.engagement, off = [e.blocker, ...e.helpers];
        sim.disengage(e);
        // downUntil alone does not stop a player acting: he is given nothing to do and held on the ground.
        for (const o of off) { o.behavior = { kind: 'idle', update: () => stand(0) }; parked.push(o); }
        at = sim.t; d0 = best; v0 = Math.hypot(man.vel.x, man.vel.y);
      }
    }
    if (man && contact < 0 && Math.hypot(man.pos.x - q.pos.x, man.pos.y - q.pos.y) <= 1) contact = sim.t;
  };
  const res = sim.run();
  if (!man) continue;
  freed++;
  const alarm = qb.alarmAt != null && qb.alarmAt >= at ? qb.alarmAt : null;
  if (alarm != null) { al++; lag.push(alarm - at); }
  if (contact >= 0) { reached++; if (alarm != null) lead.push(contact - alarm); }
  if (res.stats.sacked) { sk++; if (alarm == null) skNo++; }
  console.log(`${concept.padEnd(12)} ${coverage} s${seed} freed ${at.toFixed(2)} at ${d0.toFixed(1)} yd, ${v0.toFixed(1)} yd/s | alarm ${alarm != null ? `+${(alarm - at).toFixed(2)}` : '  -  '} within 1 yd ${contact >= 0 ? `+${(contact - at).toFixed(2)}` : '  -  '} | ${res.stats.sacked ? 'sacked' : res.stats.completed ? 'complete' : res.stats.interceptedBy ? 'intercepted' : 'other'}`);
}
const q = (v: number[], p = 0.5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))].toFixed(2) : ' - '; };
console.log(`freed ${freed}, alarmed ${al} (p50 ${q(lag)} s after he came free), man within 1 yd with the ball still in his hand ${reached} (${reached - lead.length} with no alarm first), alarm ahead of that p25/p50 ${q(lead, 0.25)}/${q(lead)} s (n ${lead.length}), sacked ${sk}, sacked with no alarm ${skNo}`);
