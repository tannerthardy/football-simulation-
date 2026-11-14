export const stack: { schemaVersion: number; id: string; flags: Record<string, 'on' | 'off' | 'retired'>; numeric?: Record<string, { default: number; legacy: number }> };
export function reads(): Record<string, 'on' | 'off'>;
export function experimental(): string[];
export function mismatches(): { undeclared: string[]; notInSrc: string[]; wrongDefault: string[] };
export function environment(ambient: Record<string, string | undefined>, overrides?: string[], off?: boolean): Record<string, string | undefined>;
export function numericReads(): Record<string, number>;
export function numericMismatches(): { notInSrc: string[]; wrongDefault: string[] };
