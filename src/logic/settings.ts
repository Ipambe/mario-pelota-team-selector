import type {
  GameSettings,
  SelectionMode,
  SplitSideAssignment
} from '../types/game'

export type { GameSettings }

export const SETTINGS_STORAGE_KEY = 'mario_pelota_settings'

export const DEFAULT_SETTINGS: GameSettings = {
  autoSelect: false,
  allowDuplicatesInTeam: false,
  enableVariants: true,
  selectionMode: 'alternate',
  splitSides: 'left1-right2'
}

export const SELECTION_MODES: readonly SelectionMode[] = [
  'alternate',
  'sequential',
  'neighbors'
]

const VALID_SPLIT_SIDES: readonly SplitSideAssignment[] = [
  'left1-right2',
  'left2-right1'
]

/**
 * Loads game settings from localStorage (or returns default settings if not available).
 */
export function loadSettings(): GameSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SETTINGS }
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    return {
      autoSelect:
        typeof parsed.autoSelect === 'boolean'
          ? parsed.autoSelect
          : DEFAULT_SETTINGS.autoSelect,
      allowDuplicatesInTeam:
        typeof parsed.allowDuplicatesInTeam === 'boolean'
          ? parsed.allowDuplicatesInTeam
          : DEFAULT_SETTINGS.allowDuplicatesInTeam,
      enableVariants:
        typeof parsed.enableVariants === 'boolean'
          ? parsed.enableVariants
          : DEFAULT_SETTINGS.enableVariants,
      selectionMode: SELECTION_MODES.includes(parsed.selectionMode)
        ? parsed.selectionMode
        : DEFAULT_SETTINGS.selectionMode,
      splitSides: VALID_SPLIT_SIDES.includes(parsed.splitSides)
        ? parsed.splitSides
        : DEFAULT_SETTINGS.splitSides
    }
  } catch (err) {
    console.warn('Failed to load settings from localStorage:', err)
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * Returns the next selection mode in cyclic order: alternate -> sequential -> neighbors -> alternate
 */
export function getNextSelectionMode(
  currentMode: SelectionMode
): SelectionMode {
  const currentIndex = SELECTION_MODES.indexOf(currentMode)
  if (currentIndex === -1) {
    return 'alternate'
  }
  const nextIndex = (currentIndex + 1) % SELECTION_MODES.length
  return SELECTION_MODES[nextIndex]
}

/**
 * Toggles the split sides assignment between left1-right2 and left2-right1.
 */
export function toggleSplitSides(
  current: SplitSideAssignment
): SplitSideAssignment {
  return current === 'left1-right2' ? 'left2-right1' : 'left1-right2'
}

/**
 * Saves game settings to localStorage.
 */
export function saveSettings(settings: GameSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('Failed to save settings to localStorage:', err)
  }
}
