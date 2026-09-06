export interface GameSettings {
  autoSelect: boolean
}

export const SETTINGS_STORAGE_KEY = 'mario_pelota_settings'

export const DEFAULT_SETTINGS: GameSettings = {
  autoSelect: false
}

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
          : DEFAULT_SETTINGS.autoSelect
    }
  } catch (err) {
    console.warn('Failed to load settings from localStorage:', err)
    return { ...DEFAULT_SETTINGS }
  }
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
