/** Official scrimmage possession statistics, after enforcement has selected the
 * history that counts. Final possession alone cannot describe multiple
 * takeaways, and an own recovery is not a defensive fumble recovery. */
import type { TeamSide } from '../sim/agent.js';
import type { CarrierSegment, PlayResult, PlayStats } from '../sim/types.js';

export interface NativeFumbleCredit {
  playerId: string;
  team: TeamSide;
  lost: boolean;
  recoveredBy?: string;
  t?: number;
}
export interface OfficialFumbleCredit extends NativeFumbleCredit {
  recoveryTeam?: TeamSide;
}
export interface OfficialRecoveryCredit {
  playerId: string;
  team: TeamSide;
}
export interface OfficialPossessionStats {
  teamTurnovers: Record<TeamSide, number>;
  /** One entry for each fumble, including repeated fumbles by one player. */
  fumbleCredits: OfficialFumbleCredit[];
  /** Opponent fumble recoveries only; no credit for retaining one's own ball. */
  recoveryCredits: OfficialRecoveryCredit[];
}
type PossessionResult = Pick<PlayResult, 'segments' | 'stats' | 'turnover' | 'possession'>;
type LedgerStats = PlayStats & { fumbles?: readonly NativeFumbleCredit[] };
const other = (team: TeamSide): TeamSide => team === 'O' ? 'D' : 'O';

interface Transition {
  from: TeamSide;
  to: TeamSide;
  receiver: string;
  fumbler?: string;
  interception: boolean;
  usedByFumble: boolean;
}

/** The caller must first trim stats AND segments for accepted nullifying
 * penalties. A raw called foul cannot establish whether later events count.
 * Native fumbles (including an empty ledger) are authoritative. Historical
 * tapes without the ledger use achieved segments and then singular fields. */
export function deriveOfficialPossessionStats(result: PossessionResult): OfficialPossessionStats {
  const { segments, stats } = result;
  const teamTurnovers: Record<TeamSide, number> = { O: 0, D: 0 };
  const transitions: Transition[] = [];
  const playerTeams = new Map<string, TeamSide>();
  let currentTeam: TeamSide = 'O', previous: CarrierSegment | undefined;
  for (const segment of segments) {
    playerTeams.set(segment.carrier, segment.team);
    if (segment.team !== currentTeam) {
      teamTurnovers[currentTeam]++;
      transitions.push({ from: currentTeam, to: segment.team, receiver: segment.carrier,
        fumbler: previous && (previous.end === 'fumble' || segment.how === 'recovery') ? previous.carrier : undefined,
        interception: segment.how === 'interception', usedByFumble: false });
    }
    currentTeam = segment.team;
    previous = segment;
  }

  const native = (stats as LedgerStats).fumbles;
  const fumbles: NativeFumbleCredit[] = native !== undefined
    ? native.map(f => ({ ...f })) : historicalFumbles(result, playerTeams);
  for (const fumble of fumbles) playerTeams.set(fumble.playerId, fumble.team);
  const fumbleCredits: OfficialFumbleCredit[] = [], recoveryCredits: OfficialRecoveryCredit[] = [];
  for (const fumble of fumbles) {
    const recoveryTeam = fumble.recoveredBy
      ? playerTeams.get(fumble.recoveredBy) ?? (fumble.lost ? other(fumble.team) : fumble.team) : undefined;
    fumbleCredits.push({ ...fumble, ...(recoveryTeam ? { recoveryTeam } : {}) });
    if (!fumble.lost) continue;
    // A possession segment records most losses. An opponent-endzone fumble
    // touchback has no recovering player/segment and needs this ledger fact.
    const matching = transitions.find(t => !t.usedByFumble && !t.interception && t.from === fumble.team
      && (t.fumbler === fumble.playerId || (!!fumble.recoveredBy && t.receiver === fumble.recoveredBy)));
    if (matching) matching.usedByFumble = true;
    else teamTurnovers[fumble.team]++;
    if (fumble.recoveredBy && recoveryTeam === other(fumble.team)) {
      recoveryCredits.push({ playerId: fumble.recoveredBy, team: recoveryTeam });
    }
  }

  // Old recordings sometimes omit the interception possession segment. The
  // explicit actor preserves that takeaway, without counting the same actor's
  // recorded interception twice when the original offense later regains it.
  if (stats.interceptedBy && !transitions.some(t => t.to === 'D' && t.receiver === stats.interceptedBy)) {
    teamTurnovers.O++;
  }
  // Legacy final-possession-only recordings predate both the ledger and useful
  // segments. A turnover on downs is decided by Game, not PlayResult.turnover.
  if (native === undefined && result.turnover && result.possession === 'D' && teamTurnovers.O === 0) teamTurnovers.O++;
  return { teamTurnovers, fumbleCredits, recoveryCredits };
}

function historicalFumbles(result: PossessionResult, playerTeams: ReadonlyMap<string, TeamSide>): NativeFumbleCredit[] {
  const fumbles: NativeFumbleCredit[] = [];
  for (let i = 0; i < result.segments.length; i++) {
    const segment = result.segments[i];
    if (segment.end !== 'fumble') continue;
    const recovery = result.segments[i + 1];
    const lost = recovery ? recovery.team !== segment.team : result.possession !== segment.team;
    fumbles.push({ playerId: segment.carrier, team: segment.team, lost,
      ...(recovery ? { recoveredBy: recovery.carrier } : {}) });
  }
  const { stats } = result;
  if (stats.fumbledBy && !fumbles.some(f => f.playerId === stats.fumbledBy)) {
    const team = playerTeams.get(stats.fumbledBy) ?? 'O';
    // Old missed-pitch segments end as a handoff, although the singular
    // fumble field and next recovery identify the loose-ball loss.
    let nextRecovery: CarrierSegment | undefined;
    for (let i = result.segments.length - 2; i >= 0; i--) {
      if (result.segments[i].carrier === stats.fumbledBy && result.segments[i + 1].how === 'recovery') {
        nextRecovery = result.segments[i + 1]; break;
      }
    }
    const recoveredBy = nextRecovery?.carrier ?? stats.fumbleRecoveredBy;
    fumbles.push({ playerId: stats.fumbledBy, team,
      lost: nextRecovery ? nextRecovery.team !== team : stats.fumbleLost ?? (result.possession !== team),
      ...(recoveredBy ? { recoveredBy } : {}) });
  } else if (stats.fumbledBy && stats.fumbleRecoveredBy) {
    // A terminal legacy fumble may have a recovery id but no subsequent
    // possession segment. Never overwrite the next actual segment's carrier.
    const last = [...fumbles].reverse().find(f => f.playerId === stats.fumbledBy);
    if (last && !last.recoveredBy) last.recoveredBy = stats.fumbleRecoveredBy;
  }
  return fumbles;
}
