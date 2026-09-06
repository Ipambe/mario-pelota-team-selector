import { describe, expect, it } from 'vitest'
import { POSITIONS } from '../src/data/positions'
import {
  assignPlayerToTeam,
  createEmptyTeam,
  getAvailableCharacters,
  getAvailablePositions,
  isTeamComplete
} from '../src/logic/team'
import type { CharacterItem } from '../src/types/game'

describe('team logic', () => {
  const mockCharacters: CharacterItem[] = [
    { id: 0, name: 'Mario', src: 'mario.png' },
    { id: 1, name: 'Luigi', src: 'luigi.png' },
    { id: 2, name: 'Bowser', src: 'bowser.png' }
  ]

  const char0 = mockCharacters[0] as CharacterItem
  const char1 = mockCharacters[1] as CharacterItem
  const char2 = mockCharacters[2] as CharacterItem

  it('creates an empty team with all 9 positions set to null', () => {
    const team = createEmptyTeam()
    expect(Object.keys(team)).toHaveLength(9)
    expect(Object.values(team).every(slot => slot === null)).toBe(true)
    expect(isTeamComplete(team)).toBe(false)
  })

  it('returns all characters as available for an empty team', () => {
    const team = createEmptyTeam()
    const available = getAvailableCharacters(team, mockCharacters)
    expect(available).toHaveLength(mockCharacters.length)
  })

  it('excludes assigned characters from available characters', () => {
    const team = createEmptyTeam()
    assignPlayerToTeam(team, 'P', char0)

    const available = getAvailableCharacters(team, mockCharacters)
    expect(available).toHaveLength(mockCharacters.length - 1)
    expect(available.find(c => c.id === char0.id)).toBeUndefined()
  })

  it('filters out occupied positions correctly', () => {
    const team = createEmptyTeam()
    expect(getAvailablePositions(team, POSITIONS)).toHaveLength(9)

    assignPlayerToTeam(team, 'P', char0)
    const remaining = getAvailablePositions(team, POSITIONS)
    expect(remaining).toHaveLength(8)
    expect(remaining.find(p => p.code === 'P')).toBeUndefined()
  })

  it('correctly maps 1B, 2B, 3B codes to team keys FB, SB, TB', () => {
    const team = createEmptyTeam()
    assignPlayerToTeam(team, 'FB', char0)
    assignPlayerToTeam(team, 'SB', char1)
    assignPlayerToTeam(team, 'TB', char2)

    const remaining = getAvailablePositions(team, POSITIONS)
    expect(remaining.find(p => p.code === '1B')).toBeUndefined()
    expect(remaining.find(p => p.code === '2B')).toBeUndefined()
    expect(remaining.find(p => p.code === '3B')).toBeUndefined()
  })

  it('detects when a team is complete', () => {
    const team = createEmptyTeam()
    const dummy: CharacterItem = { id: 99, name: 'Dummy', src: 'dummy.png' }

    ;(['P', 'K', 'FB', 'SB', 'SS', 'TB', 'LF', 'CF', 'RF'] as const).forEach(
      pos => {
        expect(isTeamComplete(team)).toBe(false)
        assignPlayerToTeam(team, pos, dummy)
      }
    )

    expect(isTeamComplete(team)).toBe(true)
    expect(getAvailablePositions(team, POSITIONS)).toHaveLength(0)
  })

  it('saves selected variant information when assigning player', () => {
    const team = createEmptyTeam()
    assignPlayerToTeam(team, 'P', char0, 'RED')
    expect(team.P?.selectedVariant).toBe('RED')
  })
})
