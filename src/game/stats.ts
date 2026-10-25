/** Box score accumulation. */
import type { Player } from '../players/types.js';

export interface PlayerLine {
  id: string;
  name: string;
  pos: string;
  team: string;
  // passing
  att: number;
  cmp: number;
  passYds: number;
  passTD: number;
  int: number;
  sacked: number;
  sackYds: number;
  // rushing
  rushAtt: number;
  rushYds: number;
  rushTD: number;
  rushLong: number;
  fumbles: number;
  fumblesLost: number;
  // receiving
  targets: number;
  rec: number;
  recYds: number;
  recTD: number;
  recLong: number;
  yac: number;
  drops: number;
  // defense
  tackles: number;
  sacks: number;
  tfl: number;
  defInt: number;
  pd: number;
  ff: number;
  fr: number;
  pressures: number;
  missedTackles: number;
  // kicking
  fga: number;
  fgm: number;
  fgLong: number;
  xpa: number;
  xpm: number;
  punts: number;
  puntYds: number;
  // misc
  penalties: number;
  snaps: number;
}

export interface TeamLine {
  firstDowns: number;
  plays: number;
  totalYds: number;
  passYds: number;
  rushYds: number;
  turnovers: number;
  penalties: number;
  penaltyYds: number;
  thirdAtt: number;
  thirdConv: number;
  fourthAtt: number;
  fourthConv: number;
  redZoneTrips: number;
  redZoneTDs: number;
  timeOfPossession: number;
  sacksAllowed: number;
  explosivePlays: number;
}

export class BoxScore {
  readonly players = new Map<string, PlayerLine>();
  readonly teams: Record<string, TeamLine> = {};

  team(abbr: string): TeamLine {
    return (this.teams[abbr] ??= {
      firstDowns: 0, plays: 0, totalYds: 0, passYds: 0, rushYds: 0, turnovers: 0, penalties: 0, penaltyYds: 0,
      thirdAtt: 0, thirdConv: 0, fourthAtt: 0, fourthConv: 0, redZoneTrips: 0, redZoneTDs: 0, timeOfPossession: 0,
      sacksAllowed: 0, explosivePlays: 0,
    });
  }

  line(p: Player, team: string): PlayerLine {
    let l = this.players.get(p.id);
    if (!l) {
      l = {
        id: p.id, name: `${p.firstName[0]}.${p.lastName}`, pos: p.position, team,
        att: 0, cmp: 0, passYds: 0, passTD: 0, int: 0, sacked: 0, sackYds: 0,
        rushAtt: 0, rushYds: 0, rushTD: 0, rushLong: 0, fumbles: 0, fumblesLost: 0,
        targets: 0, rec: 0, recYds: 0, recTD: 0, recLong: 0, yac: 0, drops: 0,
        tackles: 0, sacks: 0, tfl: 0, defInt: 0, pd: 0, ff: 0, fr: 0, pressures: 0, missedTackles: 0,
        fga: 0, fgm: 0, fgLong: 0, xpa: 0, xpm: 0, punts: 0, puntYds: 0, penalties: 0, snaps: 0,
      };
      this.players.set(p.id, l);
    }
    return l;
  }

  teamPlayers(abbr: string): PlayerLine[] {
    return [...this.players.values()].filter((l) => l.team === abbr);
  }
}
