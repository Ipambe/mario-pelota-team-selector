import type { CharacterItem, PositionItem, VariantItem } from '../types/game'

export const ITEM_WIDTH = 160
export const TOTAL_ITEMS_IN_REEL = 70
export const WINNING_INDEX = 55
export const SPIN_DURATION_MS = 6500
export const CONTAINER_WIDTH = 800

/**
 * Pure Fisher-Yates shuffle that returns a new shuffled array without mutating the original.
 */
export function shuffle<T>(array: readonly T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = arr[i]
    const target = arr[j]
    if (current !== undefined && target !== undefined) {
      arr[i] = target
      arr[j] = current
    }
  }
  return arr
}

/**
 * Generates an equitable reel sequence by repeating a single shuffled block of items.
 */
export function generateEquitableReel<T>(
  items: readonly T[],
  total: number
): T[] {
  if (items.length === 0) return []
  const shuffledBlock = shuffle(items)
  const result: T[] = []
  for (let i = 0; i < total; i++) {
    const item = shuffledBlock[i % shuffledBlock.length]
    if (item !== undefined) {
      result.push(item)
    }
  }
  return result
}

export function generateCharacterReel(
  availableCharacters: readonly CharacterItem[],
  total: number = TOTAL_ITEMS_IN_REEL
): CharacterItem[] {
  return generateEquitableReel(availableCharacters, total)
}

export function generateVariantReel(
  character: CharacterItem,
  variants: readonly string[],
  total: number = TOTAL_ITEMS_IN_REEL
): VariantItem[] {
  const options: VariantItem[] = [
    {
      name: 'default',
      isDefault: true,
      characterSrc: character.src
    },
    ...variants.map(v => ({
      name: v,
      isDefault: false,
      characterSrc: character.src
    }))
  ]

  return generateEquitableReel(options, total)
}

export function generatePositionReel(
  availablePositions: readonly PositionItem[],
  total: number = TOTAL_ITEMS_IN_REEL
): PositionItem[] {
  return generateEquitableReel(availablePositions, total)
}

/**
 * Calculates the exact scroll target in pixels for the roulette reel.
 */
export function calculateReelTargetOffset(
  winningIndex: number = WINNING_INDEX,
  itemWidth: number = ITEM_WIDTH,
  containerWidth: number = CONTAINER_WIDTH,
  randomInnerOffset: number = (Math.random() - 0.5) * (ITEM_WIDTH - 30)
): number {
  const cardCenterOffset = itemWidth / 2
  const containerCenterOffset = containerWidth / 2
  return (
    winningIndex * itemWidth +
    cardCenterOffset -
    containerCenterOffset +
    randomInnerOffset
  )
}
