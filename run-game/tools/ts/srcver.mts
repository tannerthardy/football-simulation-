const root = process.cwd();
const m = await import(process.argv[2]);
console.log(m.sourceVersion());
