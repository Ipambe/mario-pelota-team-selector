import { POSITION_TO_TEAM_KEY } from '../data/positions'
import type {
  BaseballPositionKey,
  CharacterItem,
  PositionItem,
  TeamRoster
} from '../types/game'

/**
 * Creates a new, empty team roster with all 9 positions set to null.
 */
export function createEmptyTeam(): TeamRoster {
  return {
    P: null,
    K: null,
    FB: null,
    SB: null,
    SS: null,
    TB: null,
    LF: null,
    CF: null,
    RF: null
  }
}

/**
 * Returns character IDs that are already assigned to the given team.
 */
export function getOccupiedCharacterIds(team: TeamRoster): number[] {
  return Object.values(team)
    .filter((item): item is CharacterItem => item !== null)
    .map(item => item.id)
}

/**
 * Returns the list of characters available for the team.
 * If allowDuplicatesInTeam is true, characters already assigned to the team can be selected again.
 * If allowDuplicatesInTeam is false, occupied characters are excluded.
 */
export function getAvailableCharacters(
  team: TeamRoster,
  allCharacters: readonly CharacterItem[],
  allowDuplicatesInTeam = false
): CharacterItem[] {
  if (allowDuplicatesInTeam) {
    return [...allCharacters]
  }
  const occupiedIds = getOccupiedCharacterIds(team)
  return allCharacters.filter(item => !occupiedIds.includes(item.id))
}

/**
 * Returns the list of positions that are still unoccupied in the team.
 */
export function getAvailablePositions(
  team: TeamRoster,
  allPositions: readonly PositionItem[]
): PositionItem[] {
  return allPositions.filter(pos => {
    const key = POSITION_TO_TEAM_KEY[pos.code]
    return key && team[key] === null
  })
}

/**
 * Checks if all 9 positions of the team are occupied.
 */
export function isTeamComplete(team: TeamRoster): boolean {
  return Object.values(team).every(slot => slot !== null)
}

/**
 * Assigns a player (with optional variant) to a specific position on the team.
 */
export function assignPlayerToTeam(
  team: TeamRoster,
  positionKey: BaseballPositionKey,
  player: CharacterItem,
  variant?: string | null
): void {
  team[positionKey] = {
    ...player,
    ...(variant ? { selectedVariant: variant } : {})
  }
}
