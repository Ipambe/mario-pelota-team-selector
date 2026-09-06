import { describe, expect, it } from 'vitest'
import {
  calculateReelTargetOffset,
  generateCharacterReel,
  generateEquitableReel,
  generatePositionReel,
  generateVariantReel,
  shuffle,
  TOTAL_ITEMS_IN_REEL,
  WINNING_INDEX
} from '../src/logic/roulette'
import type { CharacterItem, PositionItem } from '../src/types/game'

describe('roulette logic', () => {
  const sampleCharacters: CharacterItem[] = [
    { id: 1, name: 'Mario', src: 'mario.png' },
    { id: 2, name: 'Luigi', src: 'luigi.png' },
    { id: 3, name: 'Peach', src: 'peach.png' }
  ]

  const samplePositions: PositionItem[] = [
    { code: 'P', name: 'PITCHER' },
    { code: 'K', name: 'CATCHER' }
  ]

  describe('shuffle', () => {
    it('preserves array length and elements', () => {
      const original = [1, 2, 3, 4, 5]
      const shuffled = shuffle(original)

      expect(shuffled).toHaveLength(original.length)
      expect(shuffled.sort()).toEqual(original.sort())
    })

    it('does not mutate the original array', () => {
      const original = [10, 20, 30]
      const copy = [...original]
      shuffle(original)
      expect(original).toEqual(copy)
    })

    it('handles empty and single-element arrays', () => {
      expect(shuffle([])).toEqual([])
      expect(shuffle([42])).toEqual([42])
    })
  })

  describe('generateEquitableReel', () => {
    it('returns exact total requested elements', () => {
      const reel = generateEquitableReel(sampleCharacters, 70)
      expect(reel).toHaveLength(70)
    })

    it('returns empty array when source is empty', () => {
      const reel = generateEquitableReel([], 70)
      expect(reel).toEqual([])
    })

    it('contains elements from the source array evenly', () => {
      const reel = generateEquitableReel([1, 2], 10)
      const count1 = reel.filter(x => x === 1).length
      const count2 = reel.filter(x => x === 2).length
      expect(count1).toBe(5)
      expect(count2).toBe(5)
    })
  })

  describe('generateCharacterReel & generatePositionReel', () => {
    it('generates reel of TOTAL_ITEMS_IN_REEL by default', () => {
      const reel = generateCharacterReel(sampleCharacters)
      expect(reel).toHaveLength(TOTAL_ITEMS_IN_REEL)
      expect(reel[WINNING_INDEX]).toBeDefined()
    })

    it('generates position reel properly', () => {
      const reel = generatePositionReel(samplePositions)
      expect(reel).toHaveLength(TOTAL_ITEMS_IN_REEL)
      expect(samplePositions.map(p => p.code)).toContain(
        reel[WINNING_INDEX]?.code
      )
    })
  })

  describe('generateVariantReel', () => {
    it('includes default and custom variant options', () => {
      const variants = ['red', 'blue']
      const targetChar = sampleCharacters[0] as CharacterItem
      const reel = generateVariantReel(targetChar, variants, 30)
      expect(reel).toHaveLength(30)

      const defaultItem = reel.find(item => item.isDefault)
      expect(defaultItem).toBeDefined()
      expect(defaultItem?.name).toBe('default')

      const customItem = reel.find(item => item.name === 'red')
      expect(customItem).toBeDefined()
      expect(customItem?.isDefault).toBe(false)
    })
  })

  describe('calculateReelTargetOffset', () => {
    it('computes offset centered around the winning item', () => {
      const offset = calculateReelTargetOffset(55, 160, 800, 0)
      // 55 * 160 + 80 - 400 = 8800 + 80 - 400 = 8480
      expect(offset).toBe(8480)
    })
  })
})
