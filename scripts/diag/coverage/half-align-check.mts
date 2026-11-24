// HALF_ALIGN: a two-high halves safety's width from the ball at alignment, against #1's and #2's splits on his side, over
// formations, flips and ball spots (Cover 2 / 2 Match / Tampa 2). Read-only: the installed alignment.
//   HALF_ALIGN=1 node --import tsx scripts/diag/coverage/half-align-check.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const rows: any[] = [];
for (const formation of Object.keys(FORMATION_BY_ID)) for (const coverage of ['cover2', 'cover2_match', 'tampa2']) for (const flip of [false, true]) for (const seed of [1, 2]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation, flip })); } catch { continue; }
  const off = sim.offAlign, by = sim.ballY, s = off.strongSign;
  for (const [slot, sign] of [['SS', s], ['FS', -s]] as const) {
    const sp = sim.defAlign?.spots?.[slot]; const role = sp && sim.defCall.coverage.roles[slot];
    if (!sp || !(role?.kind === 'zone' && role.zone.startsWith('deep_half'))) continue;
    const side = sign === s ? 'S' : 'W', one = off.numbering[`${side}1`], two = off.numbering[`${side}2`];
    const split = (r: string | undefined) => r ? Math.abs(off.spots[r].pos.y - by) : null;
    const twoDet = two && !off.spots[two].inline;
    rows.push({ formation, w: Math.abs(sp.pos.y - by), s1: split(one), s2: twoDet ? split(two) : null });
  }
}
const withTwo = rows.filter((r) => r.s2 !== null), noTwo = rows.filter((r) => r.s2 === null && r.s1 !== null);
const med = (v: number[]) => { const x = [...v].sort((a, b) => a - b); return x.length ? +x[Math.floor(x.length / 2)].toFixed(2) : null; };
const bin = (s1: number) => s1 < 12 ? 'tight' : s1 < 17 ? 'normal' : 'wide';
const out: any = { HALF_ALIGN: process.env.HALF_ALIGN ?? '0', n: rows.length };
for (const b of ['tight', 'normal', 'wide']) {
  const r = withTwo.filter((x) => bin(x.s1) === b);
  out[`with #2, #1 ${b}`] = { n: r.length, widthMinusTwo: med(r.map((x) => x.w - x.s2)), shareOfOne: med(r.map((x) => x.w / x.s1)) };
}
out['no #2'] = { n: noTwo.length, shareOfOne: med(noTwo.map((x) => x.w / x.s1)) };
console.log(JSON.stringify(out));
