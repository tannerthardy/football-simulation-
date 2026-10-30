const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
PlaySim.recordedSingleStream = true;
process.env.EDGE_CONTAIN = '0'; process.env.SEAL_HOLD = '0';
const { compareAbandonment } = await import(root + '/scripts/diag/cov7-abandonment.ts');
for (const k of ['run', 'deception'] as const) { const t = Date.now(); const r = compareAbandonment(k); console.log(k, ((Date.now() - t) / 1000).toFixed(2), 's', r.summary.result); }
