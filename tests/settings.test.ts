import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getNextSelectionMode,
  loadSettings,
  SETTINGS_STORAGE_KEY,
  saveSettings
} from '../src/logic/settings'

describe('settings logic', () => {
  let store: Record<string, string> = {}

  beforeEach(() => {
    store = {}

    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      }
    }

    // Set mock window and localStorage
    // @ts-expect-error - mock window for testing in node env
    globalThis.window = {
      localStorage: mockStorage
    }
  })

  it('returns default settings when storage is empty', () => {
    const settings = loadSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
    expect(settings.autoSelect).toBe(false)
    expect(settings.allowDuplicatesInTeam).toBe(false)
    expect(settings.enableVariants).toBe(true)
    expect(settings.selectionMode).toBe('alternate')
  })

  it('saves and loads settings correctly from localStorage', () => {
    saveSettings({
      autoSelect: true,
      allowDuplicatesInTeam: true,
      enableVariants: false,
      selectionMode: 'sequential'
    })
    const loaded = loadSettings()
    expect(loaded.autoSelect).toBe(true)
    expect(loaded.allowDuplicatesInTeam).toBe(true)
    expect(loaded.enableVariants).toBe(false)
    expect(loaded.selectionMode).toBe('sequential')
  })

  it('falls back to default values when saved settings contain invalid mode', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        autoSelect: true,
        selectionMode: 'invalid-mode'
      })
    )
    const loaded = loadSettings()
    expect(loaded.autoSelect).toBe(true)
    expect(loaded.selectionMode).toBe('alternate')
  })

  it('handles corrupted JSON in localStorage gracefully', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, 'invalid-json{')
    const loaded = loadSettings()
    expect(loaded).toEqual(DEFAULT_SETTINGS)
  })

  it('cycles through selection modes correctly in order', () => {
    expect(getNextSelectionMode('alternate')).toBe('sequential')
    expect(getNextSelectionMode('sequential')).toBe('neighbors')
    expect(getNextSelectionMode('neighbors')).toBe('alternate')
  })

  it('falls back to alternate if an unknown mode is passed to getNextSelectionMode', () => {
    // @ts-expect-error - testing invalid mode input
    expect(getNextSelectionMode('unknown-mode')).toBe('alternate')
  })
})
