export type BaseballPositionKey =
  | 'P'
  | 'K'
  | 'FB'
  | 'SB'
  | 'SS'
  | 'TB'
  | 'LF'
  | 'CF'
  | 'RF'

export interface CharacterItem {
  id: number
  name: string
  src: string
  variant?: string[]
  selectedVariant?: string
}

// Alias for backwards compatibility
export type Item = CharacterItem

export type TeamRoster = Record<BaseballPositionKey, CharacterItem | null>

// Alias for backwards compatibility
export type TEAM = TeamRoster

export interface PositionItem {
  code: string
  name: string
}

export interface VariantItem {
  name: string
  isDefault: boolean
  characterSrc: string
}

export interface StadiumCoordinates {
  top: number
  left: number
}

export type SelectionMode = 'alternate' | 'sequential' | 'neighbors'
export type SplitSideAssignment = 'left1-right2' | 'left2-right1'

export interface GameSettings {
  autoSelect: boolean
  allowDuplicatesInTeam: boolean
  enableVariants: boolean
  selectionMode: SelectionMode
  splitSides: SplitSideAssignment
}
