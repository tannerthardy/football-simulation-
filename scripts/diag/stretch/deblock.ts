/** Who blocks the play-side end over time on the given lab cases (sim
 * internals, observation only): the blocker (+ helpers) from each change.
 * node --import tsx scripts/diag/stretch/deblock.ts CASE_ID ... (via scripts/baseline.mjs --candidate) */
async function main() {
  const { makeSim, rosters } = await import(process.cwd() + '/scripts/diag/zone-lab/lab.ts');
  for (const id of process.argv.slice(2)) {
    const [concept, dir, formation, look, roster, seed] = id.split('/');
    const sim = makeSim({ concept, dir, look, roster, seed: Number(seed), formation }, rosters());
    const runSide = (dir === 'strong') === true ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
    const de = sim.defense.filter((d: any) => d.slot.startsWith('DE') && Math.sign(d.pos.y - sim.ballY) === runSide)[0];
    const seq: string[] = []; let last = '';
    const kick = sim.offense.find((o: any) => o.behavior?.plan?.pullRole === 'kick');
    while (sim.phase === 'live' && sim.t < 3.2) {
      sim.tick();
      const e = de.engagement, who = e ? [e.blocker.slot, ...(e.helpers ?? []).map((h: any) => h.slot)].join('+') : 'free';
      if (who !== last) { seq.push(`${sim.t.toFixed(2)} ${who}`); last = who; }
    }
    console.log(`${id} DE ${de.slot} at y ${((de.pos.y - sim.ballY) * runSide).toFixed(1)} | kick ${kick?.slot}->${kick?.behavior.plan.target?.slot} | ${seq.join(' | ')}`);
  }
}
main();
