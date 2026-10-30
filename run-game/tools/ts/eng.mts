const m = await import(process.cwd() + '/scripts/scorecard/provenance.ts');
const p = (m as any).provenance?.() ?? (m as any).sourceProvenance?.();
console.log(p ? p.engineSha256 : Object.keys(m));
