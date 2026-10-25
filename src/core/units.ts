/** Physical constants and unit conversions (engine units: yards, seconds, kg). */
export const YARDS_PER_METER = 1 / 0.9144;
export const METERS_PER_YARD = 0.9144;
/** Gravity in yd/s². */
export const G = 9.80665 * YARDS_PER_METER;

export const mphToYps = (mph: number): number => (mph * 1760) / 3600;
export const ypsToMph = (yps: number): number => (yps * 3600) / 1760;
export const inchesToYards = (inches: number): number => inches / 36;
export const lbToKg = (lb: number): number => lb * 0.45359237;

/** Simulation tick. */
export const DT = 0.05;
