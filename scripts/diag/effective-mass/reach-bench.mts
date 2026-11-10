// ENGAGED_REACH bench (blocked-defender plan, piece 1): how far an engaged defender reaches for a carrier beside him,
// old rule against the free-shoulder arm. A DL facing his blocker (the blocker 0.9 yd in front, offset `bo` toward one
// side), the carrier passing at lateral offset `y` (on the free side: away from the blocker; or the blocked side) at
// depth beside the pair, for blocker control -0.5 / 0 / 0.5 / 1. Prints whether he is in range (centre distance <= arms)
// under each rule and the margin (arms - distance, yd). Pure geometry; tackle eligibility (free side or win >= 0.6) is
// separate and unchanged.
// usage: ENGAGED_REACH unaffected (engagedArms is called directly): node --import tsx scripts/diag/effective-mass/reach-bench.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const { engagedArms } = await import(`${W}/src/sim/tackle.ts`);
const rng = new Rng(4);
const DL = derivePhysical(generatePlayer(rng, 'DT')), RB = derivePhysical(generatePlayer(rng, 'RB'));
console.log(`DT reach ${DL.reach.toFixed(2)} yd (arm ${(DL.reach - 0.25).toFixed(2)}), radius ${DL.radius.toFixed(2)}; RB radius ${RB.radius.toFixed(2)}; body ${(DL.radius + RB.radius).toFixed(2)}`);
console.log('carrier at (x, y) from the DL; blocker at (0.9, bo): margin = arms - distance (yd), + = in range | old rule (free side 0.7 - 0.3 c, else 0.4) / new');
for (const bo of [0, 0.3]) for (const [x, y] of [[0, 1.0], [0, 1.5], [0, 2.0], [-0.5, 1.2], [0.5, 1.2], [0, -1.0], [0, -1.5]]) {
  const row: string[] = [];
  for (const control of [-0.5, 0, 0.5, 1]) {
    const blocker: any = { pos: { x: 0.9, y: bo } };
    const d: any = { pos: { x: 0, y: 0 }, body: { facing: 0 }, profile: DL, engagement: { blocker, control } };
    const c: any = { pos: { x, y }, profile: RB };
    const dd = Math.hypot(x, y), body = DL.radius + RB.radius;
    const blockerY = bo, freeSide = Math.abs(blockerY) >= 0.25 && blockerY * y < 0;
    const old = body + DL.reach * (freeSide ? 0.7 - 0.3 * Math.max(0, Math.min(1, control)) : 0.4);
    const now = engagedArms(d, c);
    row.push(`c ${control.toFixed(1)}: ${(old - dd).toFixed(2)} / ${(now - dd).toFixed(2)}`);
  }
  console.log(`bo ${bo.toFixed(1)} carrier (${x.toFixed(1)}, ${y.toFixed(1)}) ${y * (bo || 1) < 0 || (bo === 0 && y > 0) ? '' : ''}| ${row.join(' | ')}`);
}
