import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
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
  })

  it('saves and loads settings correctly from localStorage', () => {
    saveSettings({ autoSelect: true })
    const loaded = loadSettings()
    expect(loaded.autoSelect).toBe(true)
  })

  it('handles corrupted JSON in localStorage gracefully', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, 'invalid-json{')
    const loaded = loadSettings()
    expect(loaded).toEqual(DEFAULT_SETTINGS)
  })
})
