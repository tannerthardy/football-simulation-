/**
 * Field geometry. Units are yards. x runs end line to end line (0–120, end
 * zones 0–10 and 110–120); y runs sideline to sideline (0–53.33).
 * Inside a play the offense always attacks +x.
 */
export const FIELD_LENGTH = 120;
export const FIELD_WIDTH = 160 / 3; // 53.333…
export const OWN_GOAL_X = 10;
export const OPP_GOAL_X = 110;
export const END_LINE_X = 120;
/** NFL hashes are 70'9" from each sideline. */
export const HASH_LEFT_Y = 70.75 / 3;
export const HASH_RIGHT_Y = FIELD_WIDTH - 70.75 / 3;
export const CENTER_Y = FIELD_WIDTH / 2;
/** Top of the yard-line numbers, measured from a sideline. */
export const NUMBERS_FROM_SIDELINE = 9;
/** Goalposts: crossbar 10 ft high, uprights 18'6" apart, on the end line. */
export const CROSSBAR_HEIGHT = 10 / 3;
export const UPRIGHT_HALF_WIDTH = 18.5 / 6;

export type Hash = 'L' | 'M' | 'R';

export function hashY(h: Hash): number {
  return h === 'L' ? HASH_LEFT_Y : h === 'R' ? HASH_RIGHT_Y : CENTER_Y;
}

/** Convert "yards from own goal line" (0–100) to play-frame x. */
export const yardlineToX = (yardline: number): number => OWN_GOAL_X + yardline;
export const xToYardline = (x: number): number => x - OWN_GOAL_X;

export const inBoundsY = (y: number): boolean => y > 0 && y < FIELD_WIDTH;

/** Human-readable field position, e.g. "OWN 25", "OPP 40", "50". */
export function describeYardline(yardline: number): string {
  const y = Math.round(yardline);
  if (y === 50) return '50';
  return y < 50 ? `OWN ${y}` : `OPP ${100 - y}`;
}
