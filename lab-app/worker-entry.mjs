// Worker threads do not inherit the parent's TypeScript loader; register it here.
import { register } from 'tsx/esm/api';
register();
await import('./worker.ts');
