import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const sets = process.argv.slice(2).flatMap(f => deserialize(readFileSync(f)) as any[]);
const rows:any[]=[];
for (const p of sets) {
  const sim:any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  (globalThis as any).__HF = rows; sim.run(); (globalThis as any).__HF = null;
}
const bin=(c:number)=>c>0.5?'a >+.5':c>0.2?'b +.2..+.5':c>0?'c 0..+.2':c>-0.2?'d -.2..0':c>-0.5?'e -.5..-.2':'f <-.5';
const acc:Record<string,{n:number,rec:number,sup:number}>={};
for(const r of rows){const k=`${r.loaded?'L':'u'} ${bin(r.cos)}`;const a=acc[k]??={n:0,rec:0,sup:0};a.n++;a.rec+=+r.rec;a.sup+=r.sup;}
console.log('ticks',rows.length);
for(const [k,a] of Object.entries(acc).sort()) console.log(k.padEnd(16),String(a.n).padStart(6),'recovery',(a.rec/a.n*100).toFixed(0)+'%','support',(a.sup/a.n).toFixed(2));
