/** Zone snaps whose combination owner climbs by the overtake read: at his block_climb, his partner has the man alone
 * (no helpers) and the owner is off him, for >= 0.15 s; with the test's other conditions (keeper holds until the
 * carrier crosses, climber loads the backer before the carrier reaches him). args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
for (const arg of process.argv.slice(2)) { const [seed, idx] = arg.split(":"); const i = +idx; const p = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, "utf8")) as any[])[i];
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/zone/i.test(sim.offCall.run?.scheme ?? '')) continue;
  const combos = [...new Set(sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.combination?.backer).map((o: any) => o.behavior.plan.combination))] as any[];
  if (!combos.length) continue;
  const st = combos.map((cb: any) => ({ cb, owner: cb.members[0], partner: cb.members[1], alone: -1, release: -1, kept: true, loaded: -1, atBacker: -1 }));
  while (sim.phase === 'live' && sim.t < 3.5) {
    sim.tick();
    for (const s of st) {
      const e = s.cb.defender.engagement;
      if (s.release < 0) {
        if (e && e.blocker === s.partner && e.helpers.length === 0 && !s.owner.engagement) { if (s.alone < 0) s.alone = sim.t; } else s.alone = -1;
        const climb = sim.events.find((ev: any) => ev.type === 'block_climb' && ev.a === s.owner.idx);
        if (climb) s.release = climb.t;
        continue;
      }
      const r = sim.carrier;
      if (s.atBacker < 0 && r && r !== sim.qb && r.pos.x > s.cb.backer.pos.x - 1) s.atBacker = sim.t;
      const before = !r || r === sim.qb || r.pos.x < sim.los;
      if (before && !s.cb.defender.isDown(sim.t) && !(e && e.blocker === s.partner && sim.world.joints.includes(e.hands))) s.kept = false;
      const h = s.owner.engagement?.defender === s.cb.backer ? s.owner.engagement.hands : null;
      if (s.loaded < 0 && h && Math.hypot(h.normalForce ?? 0, h.tangentForce ?? 0) > 0) s.loaded = sim.t;
    }
  }
  for (const s of st) if (s.release > 0 && s.alone > 0 && s.release - s.alone >= .15 - 1e-9 && s.owner.tags.has('combo-check-climb'))
    console.log(`R${seed}-P${String(i).padStart(3, '0')} ${sim.offCall.run.scheme} ${s.owner.slot}+${s.partner.slot} on ${s.cb.defender.slot} -> ${s.cb.backer.slot} | alone ${s.alone.toFixed(2)} release ${s.release.toFixed(2)} kept ${s.kept} loaded ${s.loaded.toFixed(2)} carrierAtBacker ${s.atBacker.toFixed(2)} ${s.kept && s.loaded > s.release && (s.atBacker < 0 || s.loaded < s.atBacker) ? 'FULL' : ''}`);
}
